from sqlalchemy import text
from sqlalchemy.orm import Session


def sync_serial_sequence(session: Session, table: str, column: str = "id") -> None:
    session.execute(
        text(
            f"""
            SELECT setval(
                pg_get_serial_sequence('{table}', '{column}'),
                COALESCE((SELECT MAX({column}) FROM {table}), 1),
                true
            )
            """,
        ),
    )
