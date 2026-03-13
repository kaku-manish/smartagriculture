import os
import re
import sqlite3
import logging
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Sequence, Tuple

try:
    import psycopg  # psycopg v3
except Exception:
    psycopg = None

logger = logging.getLogger("agro-backend-db")

BASE_DIR = Path(__file__).resolve().parent

DATABASE_URL = os.getenv("DATABASE_URL")
IS_CLOUD = bool(DATABASE_URL)

_pg_conn = None
_sqlite_conn = None


_pg_dsn = None

def _init_connections() -> None:
    global _pg_dsn, _sqlite_conn

    if IS_CLOUD:
        logger.info("📡 Database: Using Cloud PostgreSQL (Supabase) - Lazy Connection")
        if psycopg is None:
            raise RuntimeError(
                "DATABASE_URL is set but psycopg is not installed. Install psycopg or unset DATABASE_URL."
            )

        dsn = DATABASE_URL
        if "sslmode=" not in dsn:
            sep = "&" if "?" in dsn else "?"
            dsn = f"{dsn}{sep}sslmode=require"

        _pg_dsn = dsn
    else:
        logger.info("🏠 Database: Using Local SQLite (agriculture.db)")
        original_db_path = BASE_DIR / "agriculture.db"
        if not original_db_path.exists():
            original_db_path = BASE_DIR.parent / "server" / "agriculture.db"  # fallback
            
        _sqlite_conn = sqlite3.connect(str(original_db_path), check_same_thread=False)
        _sqlite_conn.row_factory = sqlite3.Row

_init_connections()


def _convert_qmarks_to_pg(sql: str) -> str:
    count = 0

    def repl(_m):
        nonlocal count
        count += 1
        return f"${count}"

    return re.sub(r"\?", repl, sql)


def _should_add_returning(sql: str) -> bool:
    up = sql.strip().upper()
    is_mut = up.startswith("INSERT") or up.startswith("UPDATE")
    has_ret = "RETURNING" in up
    return is_mut and not has_ret


def _process_query_pg(sql: str, params: Sequence[Any] = (), is_mutation: bool = False) -> Tuple[List[Dict[str, Any]], int]:
    global _pg_conn
    if _pg_dsn is None:
        raise RuntimeError("PostgreSQL DSN not initialized")

    try:
        if _pg_conn is None or _pg_conn.closed:
            logger.info("📡 Connecting to Supabase PostgreSQL...")
            _pg_conn = psycopg.connect(_pg_dsn)
            _pg_conn.autocommit = True
    except Exception as e:
        logger.error(f"Failed to connect to Supabase PostgreSQL: {e}")
        raise RuntimeError(f"Database connection failed: {e}")

    clean_sql = sql.strip()
    clean_sql = _convert_qmarks_to_pg(clean_sql)

    if is_mutation and _should_add_returning(clean_sql):
        clean_sql = f"{clean_sql} RETURNING *"

    with _pg_conn.cursor() as cur:
        cur.execute(clean_sql, list(params) if params is not None else [])
        rows: List[Dict[str, Any]] = []
        try:
            fetched = cur.fetchall()
            cols = [d.name for d in cur.description] if cur.description else []
            for r in fetched:
                rows.append({cols[i]: r[i] for i in range(len(cols))})
        except Exception:
            rows = []
        rowcount = cur.rowcount if cur.rowcount is not None else 0
        return rows, rowcount


def _sqlite_get(sql: str, params: Sequence[Any] = ()) -> Optional[Dict[str, Any]]:
    if _sqlite_conn is None:
        raise RuntimeError("SQLite connection not initialized")
    cur = _sqlite_conn.execute(sql, list(params) if params is not None else [])
    row = cur.fetchone()
    return dict(row) if row is not None else None


def _sqlite_all(sql: str, params: Sequence[Any] = ()) -> List[Dict[str, Any]]:
    if _sqlite_conn is None:
        raise RuntimeError("SQLite connection not initialized")
    cur = _sqlite_conn.execute(sql, list(params) if params is not None else [])
    rows = cur.fetchall()
    return [dict(r) for r in rows]


def _sqlite_run(sql: str, params: Sequence[Any] = ()) -> Tuple[Optional[int], int]:
    if _sqlite_conn is None:
        raise RuntimeError("SQLite connection not initialized")
    cur = _sqlite_conn.execute(sql, list(params) if params is not None else [])
    _sqlite_conn.commit()
    return cur.lastrowid, (cur.rowcount if cur.rowcount is not None else 0)


class DB:
    def get(self, sql: str, params: Sequence[Any], callback: Callable[[Optional[Exception], Any], None]) -> None:
        try:
            if IS_CLOUD:
                rows, _ = _process_query_pg(sql, params, is_mutation=False)
                callback(None, rows[0] if rows else None)
            else:
                callback(None, _sqlite_get(sql, params))
        except Exception as e:
            logger.exception("PG/SQLite GET Error")
            callback(e, None)

    def all(self, sql: str, params: Sequence[Any], callback: Callable[[Optional[Exception], Any], None]) -> None:
        try:
            if IS_CLOUD:
                rows, _ = _process_query_pg(sql, params, is_mutation=False)
                callback(None, rows)
            else:
                callback(None, _sqlite_all(sql, params))
        except Exception as e:
            logger.exception("PG/SQLite ALL Error")
            callback(e, None)

    def run(self, sql: str, params: Sequence[Any], callback: Optional[Callable[[Optional[Exception]], None]] = None) -> Dict[str, Any]:
        try:
            if IS_CLOUD:
                rows, rowcount = _process_query_pg(sql, params, is_mutation=True)
                row = rows[0] if rows else {}
                last_id = (
                    row.get("id")
                    or row.get("user_id")
                    or row.get("farm_id")
                    or row.get("analysis_id")
                    or row.get("reading_id")
                    or None
                )
                result = {"lastID": last_id, "changes": rowcount}
                if callback:
                    callback(None)
                return result

            last_id, changes = _sqlite_run(sql, params)
            result = {"lastID": last_id, "changes": changes}
            if callback:
                callback(None)
            return result

        except Exception as e:
            logger.exception("PG/SQLite RUN Error")
            if callback:
                callback(e)
            raise

    def close(self) -> None:
        global _pg_conn, _sqlite_conn
        try:
            if IS_CLOUD and _pg_conn is not None:
                _pg_conn.close()
                _pg_conn = None
            if (not IS_CLOUD) and _sqlite_conn is not None:
                _sqlite_conn.close()
                _sqlite_conn = None
        except Exception:
            logger.exception("DB close error")


db = DB()


def db_get(sql: str, params: Sequence[Any] = ()) -> Optional[Dict[str, Any]]:
    if IS_CLOUD:
        rows, _ = _process_query_pg(sql, params, is_mutation=False)
        return rows[0] if rows else None
    return _sqlite_get(sql, params)


def db_all(sql: str, params: Sequence[Any] = ()) -> List[Dict[str, Any]]:
    if IS_CLOUD:
        rows, _ = _process_query_pg(sql, params, is_mutation=False)
        return rows
    return _sqlite_all(sql, params)


def db_run(sql: str, params: Sequence[Any] = ()) -> Dict[str, Any]:
    if IS_CLOUD:
        rows, rowcount = _process_query_pg(sql, params, is_mutation=True)
        row = rows[0] if rows else {}
        last_id = (
            row.get("id")
            or row.get("user_id")
            or row.get("farm_id")
            or row.get("analysis_id")
            or row.get("reading_id")
            or None
        )
        return {"lastID": last_id, "changes": rowcount}
    last_id, changes = _sqlite_run(sql, params)
    return {"lastID": last_id, "changes": changes}
