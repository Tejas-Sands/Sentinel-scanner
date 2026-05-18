"""OFAC sanctions address loader and checker."""

import json
import logging
from pathlib import Path
from typing import Optional

import aiosqlite

from database import get_db

logger = logging.getLogger(__name__)

# In-memory set for fast lookups
_sanctions_set: set[str] = set()
_mixer_set: set[str] = set()


async def load_sanctions_set() -> set[str]:
    """Load all sanctioned addresses into memory for fast checking."""
    global _sanctions_set
    db = await get_db()
    try:
        cursor = await db.execute("SELECT LOWER(address) FROM sanctions_addresses")
        rows = await cursor.fetchall()
        _sanctions_set = {row[0] for row in rows}
        logger.info("Loaded %d sanctions addresses into memory", len(_sanctions_set))
        return _sanctions_set
    finally:
        await db.close()


async def load_mixer_set() -> set[str]:
    """Load all known mixer addresses into memory for fast checking."""
    global _mixer_set
    db = await get_db()
    try:
        cursor = await db.execute("SELECT LOWER(address) FROM known_mixers")
        rows = await cursor.fetchall()
        _mixer_set = {row[0] for row in rows}
        logger.info("Loaded %d mixer addresses into memory", len(_mixer_set))
        return _mixer_set
    finally:
        await db.close()


def is_sanctioned(address: str) -> bool:
    """Check if an address is in the sanctions set."""
    return address.lower() in _sanctions_set


def is_mixer(address: str) -> bool:
    """Check if an address is a known mixer."""
    return address.lower() in _mixer_set


def get_sanctions_set() -> set[str]:
    """Get the current in-memory sanctions set."""
    return _sanctions_set


def get_mixer_set() -> set[str]:
    """Get the current in-memory mixer set."""
    return _mixer_set


async def get_sanctions_info(address: str) -> Optional[dict]:
    """Get sanctions metadata for an address (list name, entity, program)."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT list_name, entity_name, program, added_date FROM sanctions_addresses WHERE LOWER(address) = ?",
            (address.lower(),),
        )
        row = await cursor.fetchone()
        if row:
            return {
                "list_name": row[0],
                "entity_name": row[1],
                "program": row[2],
                "added_date": row[3],
            }
        return None
    finally:
        await db.close()


async def get_mixer_info(address: str) -> Optional[dict]:
    """Get mixer metadata for an address."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT name, chain FROM known_mixers WHERE LOWER(address) = ?",
            (address.lower(),),
        )
        row = await cursor.fetchone()
        if row:
            return {"name": row[0], "chain": row[1]}
        return None
    finally:
        await db.close()
