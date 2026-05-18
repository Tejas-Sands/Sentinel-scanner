"""Pydantic v2 request/response models for the Sentinel Scanner API."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator
import re


# --------------------------------------------------------------------------- #
#  Scan
# --------------------------------------------------------------------------- #

class ScanRequest(BaseModel):
    """Request body for POST /scan."""
    address: str = Field(..., description="Ethereum address (0x-prefixed, 42 chars)")
    chain: str = Field(default="ethereum", description="Blockchain network")

    @field_validator("address")
    @classmethod
    def validate_eth_address(cls, v: str) -> str:
        if not re.match(r"^0x[a-fA-F0-9]{40}$", v):
            raise ValueError("Invalid Ethereum address. Must be 0x-prefixed with 40 hex characters.")
        return v.lower()


class Flag(BaseModel):
    """A single risk flag raised during scanning."""
    id: str
    name: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    description: str
    evidence: dict = Field(default_factory=dict)


class Counterparty(BaseModel):
    """A counterparty address found in transactions."""
    address: str
    total_volume_usd: float = 0.0
    tx_count: int = 0
    is_sanctioned: bool = False
    is_mixer: bool = False
    label: Optional[str] = None


class ScanSummary(BaseModel):
    """Summary statistics for a scanned address."""
    tx_count: int = 0
    first_seen: Optional[str] = None
    last_seen: Optional[str] = None
    total_inflow_usd: float = 0.0
    total_outflow_usd: float = 0.0
    largest_tx_usd: float = 0.0
    labels: list[str] = Field(default_factory=list)


class ScanResponse(BaseModel):
    """Response from POST /scan and GET /scan/{scan_id}."""
    scan_id: str
    address: str
    chain: str = "ethereum"
    risk_score: int = Field(..., ge=0, le=100)
    risk_tier: str  # LOW, MEDIUM, HIGH, CRITICAL
    flags: list[Flag] = Field(default_factory=list)
    summary: ScanSummary = Field(default_factory=ScanSummary)
    counterparties: list[Counterparty] = Field(default_factory=list)
    report_url: Optional[str] = None
    created_at: Optional[str] = None
    cri: Optional[dict] = None  # CRI v2.0 intelligence report


# --------------------------------------------------------------------------- #
#  Auth
# --------------------------------------------------------------------------- #

class RegisterRequest(BaseModel):
    """Request body for POST /auth/register."""
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="Password (min 8 chars)")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", v):
            raise ValueError("Invalid email address format.")
        return v.lower()


class LoginRequest(BaseModel):
    """Request body for POST /auth/login."""
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.lower()


class UserResponse(BaseModel):
    """User profile response."""
    id: int
    email: str
    tier: str
    scans_used_this_month: int
    scans_limit: int
    scans_remaining: int
    created_at: Optional[str] = None


class TokenResponse(BaseModel):
    """Auth token response."""
    user: UserResponse
    token: str
    token_type: str = "bearer"


class GoogleLoginRequest(BaseModel):
    """Request body for Google OAuth login."""
    id_token: str = Field(..., description="Google ID Token JWT")


class MetaMaskNonceRequest(BaseModel):
    """Request body for MetaMask sign-in nonce request."""
    address: str = Field(..., description="User's Ethereum address")

    @field_validator("address")
    @classmethod
    def validate_eth_address(cls, v: str) -> str:
        if not re.match(r"^0x[a-fA-F0-9]{40}$", v):
            raise ValueError("Invalid Ethereum address. Must be 0x-prefixed with 40 hex characters.")
        return v.lower()


class MetaMaskLoginRequest(BaseModel):
    """Request body for MetaMask Web3 signature login."""
    address: str = Field(..., description="User's Ethereum address")
    signature: str = Field(..., description="Metamask personal signature string")

    @field_validator("address")
    @classmethod
    def validate_eth_address(cls, v: str) -> str:
        if not re.match(r"^0x[a-fA-F0-9]{40}$", v):
            raise ValueError("Invalid Ethereum address.")
        return v.lower()


# --------------------------------------------------------------------------- #
#  Reports
# --------------------------------------------------------------------------- #

class ReportGenerateRequest(BaseModel):
    """Request body for POST /reports/generate."""
    scan_id: str


class ReportResponse(BaseModel):
    """Report generation response."""
    report_id: str
    scan_id: str
    download_url: str
    status: str = "processing"  # processing | ready
    created_at: Optional[str] = None


# --------------------------------------------------------------------------- #
#  Health
# --------------------------------------------------------------------------- #

class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "ok"
    version: str = "1.0.0"
    environment: str = "development"
    database: str = "connected"
