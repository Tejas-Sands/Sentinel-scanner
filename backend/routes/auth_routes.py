"""Authentication endpoints — register and login."""

import logging
from datetime import datetime, timezone
from typing import Optional

import httpx
from jose import jwt
from fastapi import APIRouter, HTTPException, status, Request

from auth import create_access_token, hash_password, verify_password
from config import get_settings
from database import get_db
from limiter import limiter
from models import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
    GoogleLoginRequest,
    MetaMaskNonceRequest,
    MetaMaskLoginRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth")


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, body: RegisterRequest) -> TokenResponse:
    """Register a new user account."""
    settings = get_settings()
    db = await get_db()

    try:
        # Check if email already exists
        cursor = await db.execute("SELECT id FROM users WHERE email = ?", (body.email,))
        existing = await cursor.fetchone()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            )

        # Create user
        password_hash = hash_password(body.password)
        current_month = datetime.now(timezone.utc).strftime("%Y-%m")

        cursor = await db.execute(
            """INSERT INTO users (email, password_hash, tier, scans_used_this_month, scans_limit, month_reset)
               VALUES (?, ?, 'free', 0, ?, ?)""",
            (body.email, password_hash, settings.free_scan_limit, current_month),
        )
        await db.commit()

        user_id = cursor.lastrowid
        token = create_access_token(user_id, body.email)

        return TokenResponse(
            user=UserResponse(
                id=user_id,
                email=body.email,
                tier="free",
                scans_used_this_month=0,
                scans_limit=settings.free_scan_limit,
                scans_remaining=settings.free_scan_limit,
            ),
            token=token,
        )
    finally:
        await db.close()


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest) -> TokenResponse:
    """Authenticate a user and return a JWT token."""
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT id, email, password_hash, tier, scans_used_this_month, scans_limit, month_reset
               FROM users WHERE email = ?""",
            (body.email,),
        )
        row = await cursor.fetchone()

        if not row or not verify_password(body.password, row[2]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        user_id = row[0]
        email = row[1]
        tier = row[3]
        scans_used = row[4]
        scans_limit = row[5]

        # Reset if new month
        current_month = datetime.now(timezone.utc).strftime("%Y-%m")
        month_reset = row[6] or ""
        if month_reset != current_month:
            await db.execute(
                "UPDATE users SET scans_used_this_month = 0, month_reset = ? WHERE id = ?",
                (current_month, user_id),
            )
            await db.commit()
            scans_used = 0

        token = create_access_token(user_id, email)

        return TokenResponse(
            user=UserResponse(
                id=user_id,
                email=email,
                tier=tier,
                scans_used_this_month=scans_used,
                scans_limit=scans_limit,
                scans_remaining=max(0, scans_limit - scans_used),
            ),
            token=token,
        )
    finally:
        await db.close()


# --------------------------------------------------------------------------- #
#  Google Authentication Route
# --------------------------------------------------------------------------- #

async def verify_google_token(id_token: str) -> Optional[dict]:
    try:
        # Fetch Google public keys dynamically
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get("https://www.googleapis.com/oauth2/v3/certs")
            if resp.status_code != 200:
                return None
            jwks = resp.json()

        # Decode using jose JWT with Google's JWKs
        payload = jwt.decode(
            id_token,
            jwks,
            algorithms=["RS256"],
            options={"verify_aud": False}
        )
        
        # Verify issuer
        if payload.get("iss") not in ["accounts.google.com", "https://accounts.google.com"]:
            return None
            
        return payload
    except Exception as e:
        logger.debug("Google token verification failed: %s", e)
        return None


@router.post("/google", response_model=TokenResponse)
@limiter.limit("5/minute")
async def google_login(request: Request, body: GoogleLoginRequest) -> TokenResponse:
    """Authenticate a user using a Google ID Token (OAuth 2.0)."""
    payload = await verify_google_token(body.id_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Google ID Token.",
        )

    email = payload.get("email").lower()
    settings = get_settings()
    db = await get_db()

    try:
        # Check if user exists
        cursor = await db.execute(
            "SELECT id, email, tier, scans_used_this_month, scans_limit, month_reset FROM users WHERE email = ?",
            (email,)
        )
        row = await cursor.fetchone()

        if row:
            user_id = row[0]
            tier = row[2]
            scans_used = row[3]
            scans_limit = row[4]
            month_reset = row[5] or ""
        else:
            # Create a new Google SSO user
            current_month = datetime.now(timezone.utc).strftime("%Y-%m")
            cursor = await db.execute(
                """INSERT INTO users (email, password_hash, tier, scans_used_this_month, scans_limit, month_reset)
                   VALUES (?, '', 'free', 0, ?, ?)""",
                (email, settings.free_scan_limit, current_month)
            )
            await db.commit()
            user_id = cursor.lastrowid
            tier = "free"
            scans_used = 0
            scans_limit = settings.free_scan_limit
            month_reset = current_month

        # Reset scans if new month
        current_month = datetime.now(timezone.utc).strftime("%Y-%m")
        if month_reset != current_month:
            await db.execute(
                "UPDATE users SET scans_used_this_month = 0, month_reset = ? WHERE id = ?",
                (current_month, user_id),
            )
            await db.commit()
            scans_used = 0

        token = create_access_token(user_id, email)
        return TokenResponse(
            user=UserResponse(
                id=user_id,
                email=email,
                tier=tier,
                scans_used_this_month=scans_used,
                scans_limit=scans_limit,
                scans_remaining=max(0, scans_limit - scans_used),
            ),
            token=token,
        )
    finally:
        await db.close()


# --------------------------------------------------------------------------- #
#  MetaMask Web3 Authentication Routes
# --------------------------------------------------------------------------- #

@router.post("/metamask/nonce")
@limiter.limit("5/minute")
async def metamask_nonce(request: Request, body: MetaMaskNonceRequest) -> dict:
    """Generate a random cryptographic sign-in nonce for a MetaMask wallet."""
    import uuid
    from services.cache_manager import set_cache

    address = body.address.lower()
    nonce = str(uuid.uuid4())
    message = f"Sign this message to log into Sentinel Compliance: {nonce}"
    
    # Store challenge message in cache for 5 minutes
    await set_cache(f"metamask_challenge:{address}", message, ttl_seconds=300)
    
    return {"address": address, "message": message}


@router.post("/metamask/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def metamask_login(request: Request, body: MetaMaskLoginRequest) -> TokenResponse:
    """Authenticate a MetaMask wallet using a Web3 cryptographic signature."""
    from services.cache_manager import get_cache
    from eth_account.messages import encode_defunct
    from eth_account import Account

    address = body.address.lower()
    challenge_key = f"metamask_challenge:{address}"
    expected_message = await get_cache(challenge_key)

    if not expected_message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nonce expired or challenge not initiated. Request a nonce first.",
        )

    # Cryptographically recover the signing address
    try:
        encoded_msg = encode_defunct(text=expected_message)
        recovered_address = Account.recover_message(encoded_msg, signature=body.signature).lower()
    except Exception as e:
        logger.debug("Signature recovery failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to recover signing address. Invalid signature format.",
        )

    if recovered_address != address:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Cryptographic proof failed. Signature belongs to {recovered_address}, not {address}.",
        )

    # Wallet verified! Look up or create metamask account
    email = f"{address}@metamask.local"
    settings = get_settings()
    db = await get_db()

    try:
        cursor = await db.execute(
            "SELECT id, email, tier, scans_used_this_month, scans_limit, month_reset FROM users WHERE email = ?",
            (email,)
        )
        row = await cursor.fetchone()

        if row:
            user_id = row[0]
            tier = row[2]
            scans_used = row[3]
            scans_limit = row[4]
            month_reset = row[5] or ""
        else:
            # Create a new MetaMask wallet user
            current_month = datetime.now(timezone.utc).strftime("%Y-%m")
            cursor = await db.execute(
                """INSERT INTO users (email, password_hash, tier, scans_used_this_month, scans_limit, month_reset)
                   VALUES (?, '', 'free', 0, ?, ?)""",
                (email, settings.free_scan_limit, current_month)
            )
            await db.commit()
            user_id = cursor.lastrowid
            tier = "free"
            scans_used = 0
            scans_limit = settings.free_scan_limit
            month_reset = current_month

        # Reset scans if new month
        current_month = datetime.now(timezone.utc).strftime("%Y-%m")
        if month_reset != current_month:
            await db.execute(
                "UPDATE users SET scans_used_this_month = 0, month_reset = ? WHERE id = ?",
                (current_month, user_id),
            )
            await db.commit()
            scans_used = 0

        token = create_access_token(user_id, email)
        return TokenResponse(
            user=UserResponse(
                id=user_id,
                email=email,
                tier=tier,
                scans_used_this_month=scans_used,
                scans_limit=scans_limit,
                scans_remaining=max(0, scans_limit - scans_used),
            ),
            token=token,
        )
    finally:
        await db.close()
