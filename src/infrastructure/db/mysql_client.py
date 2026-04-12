import json
from typing import Any

import pymysql
from pymysql.cursors import DictCursor

from src.common.config.settings import settings
from src.common.logging.logger import get_logger


logger = get_logger(__name__)


def get_connection() -> pymysql.Connection:
    return pymysql.connect(
        host=settings.mysql_host,
        port=settings.mysql_port,
        user=settings.mysql_user,
        password=settings.mysql_password,
        database=settings.mysql_database,
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=True,
    )


def fetch_all(sql: str, params: tuple = ()) -> list[dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()
    for row in rows:
        _decode_json_fields(row)
    return rows


def fetch_one(sql: str, params: tuple = ()) -> dict[str, Any] | None:
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            row = cursor.fetchone()
    if row:
        _decode_json_fields(row)
    return row


def execute(sql: str, params: tuple = ()) -> int:
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            return cursor.rowcount


def execute_many(sql: str, params_list: list[tuple]) -> int:
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.executemany(sql, params_list)
            return cursor.rowcount


def _decode_json_fields(row: dict) -> None:
    for key, value in row.items():
        if isinstance(value, str) and value.startswith(("{", "[")):
            try:
                row[key] = json.loads(value)
            except (json.JSONDecodeError, ValueError):
                pass
