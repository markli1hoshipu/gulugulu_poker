"""Database connection management for CRM Service."""

import os
import logging
from typing import Optional
from contextlib import contextmanager
import sqlite3
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from psycopg2.extras import RealDictCursor

from config.settings import settings

logger = logging.getLogger(__name__)


class DatabaseConnection:
    """Database connection manager with pooling support."""
    
    def __init__(self):
        self._pool: Optional[SimpleConnectionPool] = None
        self._sqlite_conn: Optional[sqlite3.Connection] = None
        self.use_postgres = bool(settings.DATABASE_URL or settings.SESSIONS_DB_HOST)
        
        if self.use_postgres:
            self._init_postgres_pool()
        else:
            self._init_sqlite()
    
    def _init_postgres_pool(self):
        """Initialize PostgreSQL connection pool."""
        try:
            if settings.DATABASE_URL:
                # Parse DATABASE_URL if provided
                self._pool = SimpleConnectionPool(1, 20, settings.DATABASE_URL)
            else:
                # Use individual settings
                self._pool = SimpleConnectionPool(
                    1, 20,
                    host=settings.SESSIONS_DB_HOST,
                    port=settings.SESSIONS_DB_PORT,
                    user=settings.SESSIONS_DB_USER,
                    password=settings.SESSIONS_DB_PASSWORD,
                    database=settings.SESSIONS_DB_NAME
                )
            logger.info("PostgreSQL connection pool initialized")
        except Exception as e:
            logger.error(f"Failed to initialize PostgreSQL pool: {e}")
            raise
    
    def _init_sqlite(self):
        """Initialize SQLite connection for development."""
        db_path = "backend/crm/user_information.db"
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self._sqlite_conn = sqlite3.connect(db_path, check_same_thread=False)
        self._sqlite_conn.row_factory = sqlite3.Row
        logger.info(f"SQLite database initialized at {db_path}")
    
    @contextmanager
    def get_connection(self):
        """Get a database connection from the pool."""
        if self.use_postgres:
            conn = self._pool.getconn()
            try:
                yield conn
            finally:
                self._pool.putconn(conn)
        else:
            yield self._sqlite_conn
    
    @contextmanager
    def get_cursor(self, dict_cursor=True):
        """Get a database cursor."""
        with self.get_connection() as conn:
            if self.use_postgres:
                cursor = conn.cursor(cursor_factory=RealDictCursor if dict_cursor else None)
            else:
                cursor = conn.cursor()
            try:
                yield cursor
                conn.commit()
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                cursor.close()
    
    def execute_query(self, query: str, params: tuple = None):
        """Execute a query and return results."""
        with self.get_cursor() as cursor:
            cursor.execute(query, params or ())
            if cursor.description:
                if self.use_postgres:
                    return cursor.fetchall()
                else:
                    # Convert SQLite rows to dicts
                    columns = [desc[0] for desc in cursor.description]
                    return [dict(zip(columns, row)) for row in cursor.fetchall()]
            return None
    
    def execute_many(self, query: str, params_list: list):
        """Execute multiple queries."""
        with self.get_cursor() as cursor:
            cursor.executemany(query, params_list)
    
    def close(self):
        """Close all database connections."""
        if self._pool:
            self._pool.closeall()
        if self._sqlite_conn:
            self._sqlite_conn.close()


# Global database connection instance
db_connection = DatabaseConnection()


def get_db():
    """FastAPI dependency to get database connection."""
    return db_connection