from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.partners.domain.entities import Partner

VISIBLE_STATE_ID = 4


class PartnerRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_active(self) -> list[Partner]:
        rows = self.session.execute(
            text(
                """
                SELECT id, name_enterprise, service, about, image, link
                FROM partners
                WHERE state_id = :visible_state_id
                  AND deleted_at IS NULL
                ORDER BY id DESC
                """,
            ),
            {"visible_state_id": VISIBLE_STATE_ID},
        ).mappings().all()

        return [
            Partner(
                id=row["id"],
                name=row["name_enterprise"],
                slogan=row["service"],
                description=row["about"],
                logo_url=row["image"],
                link=row["link"],
                sort_order=row["id"],
            )
            for row in rows
        ]
