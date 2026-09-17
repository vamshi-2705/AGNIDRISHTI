"""
AGNIDRISHTI - Production Database Layer (PostgreSQL / PostGIS & Connection Pooling)
Smart India Hackathon (SIH 2026) | Problem Statement 26162 (NTRO)

Provides robust SQLAlchemy 2.0 connection pooling, session lifecycle management,
and PostGIS spatial database connectivity.
"""

import os
import logging
from typing import Generator
from contextlib import contextmanager
from dotenv import load_dotenv, find_dotenv

from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from sqlalchemy.pool import QueuePool, NullPool

# Load environment variables
_env_path = find_dotenv(usecwd=True)
if _env_path:
    load_dotenv(_env_path)
else:
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
    load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

logger = logging.getLogger("agnidrishti.database")

# Resolve raw DATABASE_URL from environment
RAW_DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

def normalize_database_url(url: str) -> str:
    """Normalizes PostgreSQL connection URI to use psycopg 3 driver."""
    if not url:
        # Default fallback to local SQLite if DATABASE_URL is not set
        default_sqlite = os.path.join(os.path.dirname(__file__), "agnidrishti_events.db")
        return f"sqlite:///{default_sqlite}"
    
    if url.startswith("postgres://"):
        url = "postgresql+psycopg://" + url[len("postgres://"):]
    elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
        
    return url

from sqlalchemy.engine import make_url

def mask_database_url(url: str) -> str:
    """Masks credentials in a database connection URL for safe logging."""
    if not url:
        return "None"
    try:
        u = make_url(url)
        return u.render_as_string(hide_password=True)
    except Exception:
        return "postgresql://***:***@***/***"

DATABASE_URL = normalize_database_url(RAW_DATABASE_URL)
IS_POSTGRES = DATABASE_URL.startswith("postgresql")

logger.info(f"Database configuration loaded. Backend: {'PostgreSQL' if IS_POSTGRES else 'SQLite'}, Target: {mask_database_url(DATABASE_URL)}")

# Build SQLAlchemy Engine with production connection pooling
engine_kwargs = {
    "echo": False,
    "future": True
}

if IS_POSTGRES:
    engine_kwargs.update({
        "poolclass": QueuePool,
        "pool_size": int(os.getenv("DB_POOL_SIZE", "10")),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "20")),
        "pool_timeout": float(os.getenv("DB_POOL_TIMEOUT", "30.0")),
        "pool_recycle": int(os.getenv("DB_POOL_RECYCLE", "1800")),
        "pool_pre_ping": True
    })
else:
    # SQLite configuration
    engine_kwargs["connect_args"] = {"check_same_thread": False, "timeout": 15.0}

engine = create_engine(DATABASE_URL, **engine_kwargs)

# Session factory
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False
)

Base = declarative_base()


@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """Context manager for transactional database sessions with automatic rollback on error."""
    session: Session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"Database transaction rolled back due to error: {e}")
        raise
    finally:
        session.close()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a managed database session."""
    session: Session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"FastAPI session rollback: {e}")
        raise
    finally:
        session.close()


def check_db_health() -> dict:
    """Verifies live database connectivity and reports engine telemetry."""
    try:
        with engine.connect() as conn:
            if IS_POSTGRES:
                postgis_res = conn.execute(text("SELECT PostGIS_Version();")).fetchone()
                pg_ver = conn.execute(text("SELECT version();")).fetchone()
                return {
                    "status": "HEALTHY",
                    "driver": "PostgreSQL + PostGIS",
                    "engine": "postgresql+psycopg",
                    "version": pg_ver[0] if pg_ver else "Unknown",
                    "postgis_version": postgis_res[0] if postgis_res else "None",
                    "is_postgres": True,
                    "pool_status": {
                        "size": engine.pool.size() if hasattr(engine.pool, "size") else None,
                        "checkedin": engine.pool.checkedin() if hasattr(engine.pool, "checkedin") else None,
                        "checkedout": engine.pool.checkedout() if hasattr(engine.pool, "checkedout") else None,
                        "overflow": engine.pool.overflow() if hasattr(engine.pool, "overflow") else None
                    }
                }
            else:
                return {
                    "status": "HEALTHY",
                    "driver": "SQLite (Fallback)",
                    "engine": "sqlite",
                    "is_postgres": False
                }
    except Exception as exc:
        sanitized_err = str(exc)
        if RAW_DATABASE_URL and RAW_DATABASE_URL in sanitized_err:
            sanitized_err = sanitized_err.replace(RAW_DATABASE_URL, mask_database_url(RAW_DATABASE_URL))
        logger.error(f"Database health check failure: {sanitized_err}")
        return {
            "status": "UNHEALTHY",
            "error": "Database connection failed. Check server logs.",
            "is_postgres": IS_POSTGRES
        }
