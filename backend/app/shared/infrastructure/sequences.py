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


def sync_user_id_sequence(session: Session) -> None:
    session.execute(
        text(
            """
            SELECT setval(
                COALESCE(pg_get_serial_sequence('users', 'id'), 'users_id_seq'),
                GREATEST(
                    COALESCE((SELECT last_value FROM users_id_seq), 1),
                    COALESCE((SELECT MAX(id) FROM users), 1),
                    COALESCE((SELECT MAX(user_id) FROM profiles), 1),
                    COALESCE((SELECT MAX(model_id) FROM model_has_roles), 1)
                ),
                true
            )
            """,
        ),
    )
