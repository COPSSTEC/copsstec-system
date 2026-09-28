from sqlalchemy import text
from sqlalchemy.orm import Session


def sync_serial_sequence(session: Session, table: str, column: str = "id") -> None:
    session.execute(
        text(
            f"""
            SELECT setval(
                COALESCE(
                    pg_get_serial_sequence('{table}', '{column}'),
                    '{table}_{column}_seq'
                ),
                COALESCE((SELECT MAX({column}) FROM {table}), 1),
                true
            )
            """,
        ),
    )
