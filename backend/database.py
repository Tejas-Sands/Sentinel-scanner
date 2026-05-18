"""Database connection, schema creation, and seeding with automatic dual support for SQLite and Supabase/PostgreSQL.
"""

import aiosqlite
import asyncpg
import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Union

from config import get_settings

logger = logging.getLogger(__name__)

# Global database path or URL
_db_connection_str: str = ""


def get_db_connection_str() -> str:
    """Get the database path or connection URL."""
    global _db_connection_str
    if not _db_connection_str:
        _db_connection_str = get_settings().database_path
    return _db_connection_str


def is_postgres() -> bool:
    """Check if the connection string targets a PostgreSQL database."""
    conn_str = get_db_connection_str()
    return conn_str.startswith("postgres://") or conn_str.startswith("postgresql://")


# --------------------------------------------------------------------------- #
#  PostgreSQL Compatibility Adapter Layer for aiosqlite API
# --------------------------------------------------------------------------- #

class PostgresRow:
    """Mock aiosqlite.Row supporting both key-based and index-based access."""
    def __init__(self, record: asyncpg.Record):
        self._record = record

    def __getitem__(self, key: Union[int, str]) -> Any:
        if isinstance(key, int):
            return list(self._record.values())[key]
        return self._record[key]

    def keys(self) -> list:
        return list(self._record.keys())

    def get(self, key: str, default: Any = None) -> Any:
        try:
            return self._record[key]
        except KeyError:
            return default


class PostgresCursor:
    """Mock aiosqlite.Cursor supporting fetchone, fetchall and lastrowid."""
    def __init__(self, records: list[PostgresRow], lastrowid: Any = None):
        self._records = records
        self._index = 0
        self.lastrowid = lastrowid

    async def fetchone(self) -> Any:
        if self._index < len(self._records):
            row = self._records[self._index]
            self._index += 1
            return row
        return None

    async def fetchall(self) -> list[PostgresRow]:
        return self._records


class PostgresConnection:
    """Mock aiosqlite.Connection wrapping asyncpg with SQLite syntax translation."""
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn
        self._transaction = None

    async def execute(self, sql: str, params: tuple = ()) -> PostgresCursor:
        # 1. Translate SQL dialect: sqlite "?" to pg "$1", "$2", etc.
        placeholder_count = 0
        def repl(match):
            nonlocal placeholder_count
            placeholder_count += 1
            return f"${placeholder_count}"
        
        pg_sql = re.sub(r'\?', repl, sql)

        # 2. SQLite specific "INSERT OR IGNORE" to PG "ON CONFLICT DO NOTHING"
        if "INSERT OR IGNORE" in pg_sql.upper():
            pg_sql = pg_sql.replace("INSERT OR IGNORE INTO", "INSERT INTO")
            if "sanctions_addresses" in pg_sql:
                pg_sql += " ON CONFLICT (address, list_name) DO NOTHING"
            elif "known_mixers" in pg_sql:
                pg_sql += " ON CONFLICT (address) DO NOTHING"

        # 3. Workaround for lastrowid in register/login route
        lastrowid = None
        if pg_sql.strip().upper().startswith("INSERT INTO USERS"):
            pg_sql += " RETURNING id"
            if self._transaction is None:
                self._transaction = self.conn.transaction()
                await self._transaction.start()
            record = await self.conn.fetchrow(pg_sql, *params)
            if record:
                lastrowid = record['id']
            return PostgresCursor([PostgresRow(record)] if record else [], lastrowid=lastrowid)

        # 4. Execute query
        is_select = pg_sql.strip().upper().startswith("SELECT")
        if is_select or "RETURNING" in pg_sql.upper():
            records = await self.conn.fetch(pg_sql, *params)
            return PostgresCursor([PostgresRow(r) for r in records])
        else:
            if self._transaction is None:
                self._transaction = self.conn.transaction()
                await self._transaction.start()
            await self.conn.execute(pg_sql, *params)
            return PostgresCursor([], lastrowid=None)

    async def executemany(self, sql: str, params_list: list) -> None:
        for params in params_list:
            await self.execute(sql, params)

    async def executescript(self, sql_script: str) -> None:
        # SQLite autoincrement schema conversion to Postgres Serial
        pg_script = sql_script.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
        await self.conn.execute(pg_script)

    async def commit(self) -> None:
        if self._transaction:
            await self._transaction.commit()
            self._transaction = None

    async def rollback(self) -> None:
        if self._transaction:
            await self._transaction.rollback()
            self._transaction = None

    async def close(self) -> None:
        if self._transaction:
            await self._transaction.commit()
            self._transaction = None
        await self.conn.close()


# --------------------------------------------------------------------------- #
#  Database Engine Router
# --------------------------------------------------------------------------- #

_postgres_failed: bool = False

async def get_db() -> Union[aiosqlite.Connection, PostgresConnection]:
    """Dynamically routes database queries to SQLite or PostgreSQL/Supabase."""
    global _postgres_failed
    conn_str = get_db_connection_str()
    
    if is_postgres() and not _postgres_failed:
        # postgresql:// / postgres:// connection to Supabase
        # Standardize connection string for asyncpg
        if conn_str.startswith("postgres://"):
            conn_str = conn_str.replace("postgres://", "postgresql://", 1)
        
        try:
            conn = await asyncpg.connect(conn_str, timeout=5.0, statement_cache_size=0)
            return PostgresConnection(conn)
        except Exception as e:
            logger.warning(
                "⚠️ [DATABASE] Failed to connect to Supabase PostgreSQL: %s. "
                "Network/server is unreachable. Gracefully falling back to local SQLite database!",
                e
            )
            _postgres_failed = True
            
            db = await aiosqlite.connect("./sentinel.db")
            db.row_factory = aiosqlite.Row
            try:
                await db.execute("PRAGMA journal_mode=WAL")
                await db.execute("PRAGMA foreign_keys=ON")
            except Exception:
                pass
            return db
    else:
        # SQLite connection (either by choice or fallback)
        conn_path = "./sentinel.db" if _postgres_failed else conn_str
        db = await aiosqlite.connect(conn_path)
        db.row_factory = aiosqlite.Row
        try:
            await db.execute("PRAGMA journal_mode=WAL")
            await db.execute("PRAGMA foreign_keys=ON")
        except Exception:
            pass
        return db


# --------------------------------------------------------------------------- #
#  Database Schema (Postgres-compatible default schema)
# --------------------------------------------------------------------------- #

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    tier TEXT DEFAULT 'free',
    scans_used_this_month INTEGER DEFAULT 0,
    scans_limit INTEGER DEFAULT 10,
    month_reset TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sanctions_addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    address TEXT NOT NULL,
    chain TEXT DEFAULT 'ethereum',
    list_name TEXT NOT NULL,
    entity_name TEXT,
    program TEXT,
    added_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(address, list_name)
);

CREATE TABLE IF NOT EXISTS known_mixers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    address TEXT NOT NULL UNIQUE,
    name TEXT,
    chain TEXT DEFAULT 'ethereum'
);

CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id TEXT NOT NULL UNIQUE,
    user_id INTEGER,
    address TEXT NOT NULL,
    chain TEXT DEFAULT 'ethereum',
    risk_score INTEGER NOT NULL,
    risk_tier TEXT NOT NULL,
    flags TEXT NOT NULL DEFAULT '[]',
    tx_count INTEGER,
    first_seen TIMESTAMP,
    last_seen TIMESTAMP,
    total_inflow_usd REAL DEFAULT 0,
    total_outflow_usd REAL DEFAULT 0,
    largest_tx_usd REAL DEFAULT 0,
    labels TEXT DEFAULT '[]',
    counterparties TEXT DEFAULT '[]',
    raw_data TEXT DEFAULT '{}',
    report_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scans_address ON scans(address);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at);
CREATE INDEX IF NOT EXISTS idx_sanctions_address ON sanctions_addresses(address);

CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id TEXT NOT NULL UNIQUE,
    scan_id TEXT NOT NULL REFERENCES scans(scan_id),
    file_path TEXT,
    file_size INTEGER,
    status TEXT DEFAULT 'processing',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""


async def init_db() -> None:
    """Create all tables and seed initial data."""
    logger.info("Initializing database at %s", get_db_connection_str()[:20] + "...")
    db = await get_db()
    try:
        await db.executescript(SCHEMA_SQL)
        await db.commit()
        logger.info("Database schema initialized successfully")

        # Seed data
        await _seed_sanctions(db)
        await _seed_mixers(db)
    finally:
        await db.close()


# --------------------------------------------------------------------------- #
#  Seeding Data
# --------------------------------------------------------------------------- #

KNOWN_MIXERS = [
    {"address": "0x910Cbd523D972eb0a6f4cAe4618aD62622b39DbF", "name": "Tornado Cash: Router"},
    {"address": "0x47CE0C6eD5B0Ce3d3A51fd1D7eA50f3f37dF5c7e", "name": "Tornado Cash: Proxy"},
    {"address": "0xDC73a71cb362E3C07a4eC40242B9324A2D1eE0D5", "name": "Tornado Cash: 100 ETH"},
    {"address": "0x722122dF12D4e14e13Ac3b6895B4128275C06D6", "name": "Tornado Cash: 10 ETH"},
    {"address": "0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b", "name": "Tornado Cash: 1 ETH"},
    {"address": "0xA160cdAB225685dA1d56aa342Ad8841c3b53f291", "name": "Tornado Cash: 0.1 ETH"},
    {"address": "0xD4B88Df4D29F5CedD6857912842cff3b20C8Cfa3", "name": "Tornado Cash: 100 DAI"},
    {"address": "0xFD8610d20aA15b7B2E3Be39B396a1bC3516c7144", "name": "Tornado Cash: 1000 DAI"},
    {"address": "0x07687e702b410Fa43f4cB4Af7FA097918ffD2730", "name": "Tornado Cash: 10000 DAI"},
    {"address": "0x23773E65ed146A459791799d01336DB287f25334", "name": "Tornado Cash: 100000 DAI"},
    {"address": "0x12D66f87A04A9E220743712cE6d9bB1B5616B8Fc", "name": "Tornado Cash: 0.1 ETH (old)"},
    {"address": "0x47CE0C6eD5B0Ce3d3A51fd1D7eA50f3f37dF5c7e", "name": "Tornado Cash: Governance"},
]


async def _seed_mixers(db: Any) -> None:
    count = 0
    for mixer in KNOWN_MIXERS:
        try:
            await db.execute(
                "INSERT OR IGNORE INTO known_mixers (address, name, chain) VALUES (?, ?, 'ethereum')",
                (mixer["address"].lower(), mixer["name"]),
            )
            count += 1
        except Exception as e:
            logger.warning("Failed to insert mixer %s: %s", mixer["address"], e)
    await db.commit()
    logger.info("Seeded %d known mixer addresses", count)


async def _seed_sanctions(db: Any) -> None:
    from datetime import date
    data_file = Path(__file__).parent / "data" / "ofac_addresses.json"
    if not data_file.exists():
        logger.warning("OFAC addresses file not found at %s — skipping seed", data_file)
        return

    with open(data_file, "r") as f:
        addresses = json.load(f)

    count = 0
    for entry in addresses:
        try:
            added_date_str = entry.get("added_date")
            added_date_val = None
            if added_date_str:
                try:
                    added_date_val = date.fromisoformat(added_date_str)
                except Exception:
                    added_date_val = None

            await db.execute(
                """INSERT OR IGNORE INTO sanctions_addresses
                   (address, chain, list_name, entity_name, program, added_date)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    entry["address"].lower(),
                    entry.get("chain", "ethereum"),
                    entry.get("list_name", "OFAC SDN"),
                    entry.get("entity_name", ""),
                    entry.get("program", ""),
                    added_date_val,
                ),
            )
            count += 1
        except Exception as e:
            logger.warning("Failed to insert sanctions addr %s: %s", entry.get("address"), e)
    await db.commit()
    logger.info("Seeded %d OFAC sanctions addresses", count)
