from datetime import date, datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.members.domain.entities import MEMBER_ROLE_NAME, USER_MODEL_TYPE
from app.modules.payments.domain.subscription import (
    SUBSCRIPTION_AL_DIA,
    SUBSCRIPTION_GRACIA,
    subscription_status_label,
)
from app.modules.votaciones.domain.entities import (
    CALENDAR_KEYS,
    DEFAULT_POSITIONS,
    MESSAGE_KEYS,
    OPEN_STATUSES,
    CalendarEvent,
    Election,
    ElectionCandidate,
    ElectionList,
    ElectionNotice,
    ElectionPosition,
    ElectionReport,
    ElectionSummary,
    ElectionVoter,
    MessageTemplate,
    ReportListRow,
    ReportTimelineItem,
    VoterListResult,
)
from app.shared.infrastructure.sequences import sync_serial_sequence


class SqlAlchemyElectionsRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_summaries(self) -> list[ElectionSummary]:
        rows = self.session.execute(
            text(
                """
                SELECT id, title, status, voting_starts_on, voting_ends_on,
                       term_starts_on, term_ends_on
                FROM elections
                ORDER BY id DESC
                """
            )
        ).mappings()
        return [
            ElectionSummary(
                id=row["id"],
                title=row["title"],
                status=row["status"],
                voting_starts_on=row["voting_starts_on"],
                voting_ends_on=row["voting_ends_on"],
                term_starts_on=row["term_starts_on"],
                term_ends_on=row["term_ends_on"],
                is_open=row["status"] in OPEN_STATUSES,
            )
            for row in rows
        ]

    def get_open_election(self) -> Election | None:
        row = self.session.execute(
            text(
                """
                SELECT id FROM elections
                WHERE status IN ('en_preparacion', 'publicada', 'en_votacion')
                ORDER BY id DESC
                LIMIT 1
                """
            ),
        ).mappings().first()
        return self.get_election(row["id"]) if row else None

    def get_election(self, election_id: int) -> Election | None:
        row = self.session.execute(
            text("SELECT * FROM elections WHERE id = :id"),
            {"id": election_id},
        ).mappings().first()
        if row is None:
            return None
        election = self._election_from_row(row)
        election.positions = self._load_positions(election.id)
        election.calendar = self._load_calendar(election.id)
        election.templates = self._load_templates(election.id)
        return election

    def create_election(self, title: str) -> Election:
        row = self.session.execute(
            text(
                """
                INSERT INTO elections (title, subtitle, tagline)
                VALUES (:title, :subtitle, :tagline)
                RETURNING *
                """
            ),
            {
                "title": title,
                "subtitle": "Participa en la construccion de un Colegio mas fuerte.",
                "tagline": "Tu participacion fortalece un Colegio mas fuerte",
            },
        ).mappings().first()
        assert row is not None
        election_id = row["id"]
        for index, name in enumerate(DEFAULT_POSITIONS, start=1):
            self.session.execute(
                text(
                    """
                    INSERT INTO election_positions (
                        election_id, name, sort_order, photo_required, short_profile_required
                    ) VALUES (:election_id, :name, :sort_order, TRUE, :profile)
                    """
                ),
                {"election_id": election_id, "name": name, "sort_order": index, "profile": index == 1},
            )
        for key, event_title, order in CALENDAR_KEYS:
            self.session.execute(
                text(
                    """
                    INSERT INTO election_calendar_events (
                        election_id, event_key, title, sort_order
                    ) VALUES (:election_id, :event_key, :title, :sort_order)
                    """
                ),
                {"election_id": election_id, "event_key": key, "title": event_title, "sort_order": order},
            )
        for key, msg_title, subject, body in MESSAGE_KEYS:
            self.session.execute(
                text(
                    """
                    INSERT INTO election_message_templates (
                        election_id, template_key, title, subject, body
                    ) VALUES (:election_id, :template_key, :title, :subject, :body)
                    """
                ),
                {
                    "election_id": election_id,
                    "template_key": key,
                    "title": msg_title,
                    "subject": subject,
                    "body": body,
                },
            )
        self.session.commit()
        created = self.get_election(election_id)
        assert created is not None
        return created

    def update_election(self, election: Election) -> Election:
        self.session.execute(
            text(
                """
                UPDATE elections SET
                    title = :title,
                    subtitle = :subtitle,
                    tagline = :tagline,
                    status = :status,
                    voting_starts_on = :voting_starts_on,
                    voting_ends_on = :voting_ends_on,
                    term_starts_on = :term_starts_on,
                    term_ends_on = :term_ends_on,
                    calendar_public = :calendar_public,
                    work_plan_required = :work_plan_required,
                    photo_required = :photo_required,
                    accept_position_required = :accept_position_required,
                    list_logo_enabled = :list_logo_enabled,
                    list_color_required = :list_color_required,
                    backing_document_required = :backing_document_required,
                    registration_deadline = :registration_deadline,
                    max_file_mb = :max_file_mb,
                    show_work_plan = :show_work_plan,
                    show_all_photos = :show_all_photos,
                    show_process_status = :show_process_status,
                    members_only = :members_only,
                    auto_publish_on_vote_start = :auto_publish_on_vote_start,
                    publish_from = :publish_from,
                    publish_until = :publish_until,
                    logo_url = :logo_url,
                    banner_url = :banner_url,
                    primary_color = :primary_color,
                    secondary_color = :secondary_color,
                    election_type = :election_type,
                    one_vote_per_member = :one_vote_per_member,
                    secret_vote = :secret_vote,
                    confirm_vote = :confirm_vote,
                    allow_blank_vote = :allow_blank_vote,
                    updated_at = NOW()
                WHERE id = :id
                """
            ),
            {
                "id": election.id,
                "title": election.title,
                "subtitle": election.subtitle,
                "tagline": election.tagline,
                "status": election.status,
                "voting_starts_on": election.voting_starts_on,
                "voting_ends_on": election.voting_ends_on,
                "term_starts_on": election.term_starts_on,
                "term_ends_on": election.term_ends_on,
                "calendar_public": election.calendar_public,
                "work_plan_required": election.work_plan_required,
                "photo_required": election.photo_required,
                "accept_position_required": election.accept_position_required,
                "list_logo_enabled": election.list_logo_enabled,
                "list_color_required": election.list_color_required,
                "backing_document_required": election.backing_document_required,
                "registration_deadline": election.registration_deadline,
                "max_file_mb": election.max_file_mb,
                "show_work_plan": election.show_work_plan,
                "show_all_photos": election.show_all_photos,
                "show_process_status": election.show_process_status,
                "members_only": election.members_only,
                "auto_publish_on_vote_start": election.auto_publish_on_vote_start,
                "publish_from": election.publish_from,
                "publish_until": election.publish_until,
                "logo_url": election.logo_url,
                "banner_url": election.banner_url,
                "primary_color": election.primary_color,
                "secondary_color": election.secondary_color,
                "election_type": election.election_type,
                "one_vote_per_member": election.one_vote_per_member,
                "secret_vote": election.secret_vote,
                "confirm_vote": election.confirm_vote,
                "allow_blank_vote": election.allow_blank_vote,
            },
        )
        self.session.commit()
        updated = self.get_election(election.id)
        assert updated is not None
        return updated

    def close_election(self, election_id: int, status: str) -> Election:
        self.session.execute(
            text("UPDATE elections SET status = :status, calendar_public = FALSE, updated_at = NOW() WHERE id = :id"),
            {"id": election_id, "status": status},
        )
        self.session.commit()
        closed = self.get_election(election_id)
        assert closed is not None
        return closed

    def add_position(self, election_id: int, name: str, sort_order: int) -> ElectionPosition:
        row = self.session.execute(
            text(
                """
                INSERT INTO election_positions (election_id, name, sort_order)
                VALUES (:election_id, :name, :sort_order)
                RETURNING *
                """
            ),
            {"election_id": election_id, "name": name, "sort_order": sort_order},
        ).mappings().first()
        self.session.commit()
        assert row is not None
        return self._position_from_row(row)

    def update_position(self, position: ElectionPosition) -> ElectionPosition:
        row = self.session.execute(
            text(
                """
                UPDATE election_positions SET
                    name = :name,
                    sort_order = :sort_order,
                    is_active = :is_active,
                    photo_required = :photo_required,
                    full_name_required = :full_name_required,
                    short_profile_required = :short_profile_required,
                    profession_required = :profession_required,
                    visible_to_members = :visible_to_members
                WHERE id = :id
                RETURNING *
                """
            ),
            {
                "id": position.id,
                "name": position.name,
                "sort_order": position.sort_order,
                "is_active": position.is_active,
                "photo_required": position.photo_required,
                "full_name_required": position.full_name_required,
                "short_profile_required": position.short_profile_required,
                "profession_required": position.profession_required,
                "visible_to_members": position.visible_to_members,
            },
        ).mappings().first()
        self.session.commit()
        assert row is not None
        return self._position_from_row(row)

    def reorder_positions(self, election_id: int, ids: list[int]) -> None:
        for index, position_id in enumerate(ids, start=1):
            self.session.execute(
                text(
                    """
                    UPDATE election_positions
                    SET sort_order = :sort_order
                    WHERE id = :id AND election_id = :election_id
                    """
                ),
                {"sort_order": index, "id": position_id, "election_id": election_id},
            )
        self.session.commit()

    def delete_position(self, position_id: int) -> None:
        self.session.execute(text("DELETE FROM election_positions WHERE id = :id"), {"id": position_id})
        self.session.commit()

    def position_in_use(self, position_id: int) -> bool:
        row = self.session.execute(
            text("SELECT 1 FROM election_candidates WHERE position_id = :id LIMIT 1"),
            {"id": position_id},
        ).first()
        return row is not None

    def replace_calendar(self, election_id: int, events: list[CalendarEvent]) -> list[CalendarEvent]:
        for event in events:
            self.session.execute(
                text(
                    """
                    UPDATE election_calendar_events
                    SET title = :title, starts_on = :starts_on, ends_on = :ends_on
                    WHERE election_id = :election_id AND event_key = :event_key
                    """
                ),
                {
                    "election_id": election_id,
                    "event_key": event.event_key,
                    "title": event.title,
                    "starts_on": event.starts_on,
                    "ends_on": event.ends_on,
                },
            )
        self.session.commit()
        return self._load_calendar(election_id)

    def set_calendar_public(self, election_id: int, is_public: bool) -> Election:
        self.session.execute(
            text("UPDATE elections SET calendar_public = :public, updated_at = NOW() WHERE id = :id"),
            {"id": election_id, "public": is_public},
        )
        self.session.commit()
        election = self.get_election(election_id)
        assert election is not None
        return election

    def list_lists(self, election_id: int) -> list[ElectionList]:
        rows = self.session.execute(
            text("SELECT * FROM election_lists WHERE election_id = :id ORDER BY sort_order, id"),
            {"id": election_id},
        ).mappings()
        return [self._hydrate_list(row) for row in rows]

    def get_list(self, list_id: int) -> ElectionList | None:
        row = self.session.execute(
            text("SELECT * FROM election_lists WHERE id = :id"),
            {"id": list_id},
        ).mappings().first()
        return self._hydrate_list(row) if row else None

    def create_list(self, election_id: int, data: dict) -> ElectionList:
        order_row = self.session.execute(
            text("SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM election_lists WHERE election_id = :id"),
            {"id": election_id},
        ).mappings().first()
        row = self.session.execute(
            text(
                """
                INSERT INTO election_lists (
                    election_id, name, slogan, color, description, work_plan_summary, status, sort_order
                ) VALUES (
                    :election_id, :name, :slogan, :color, :description, :work_plan_summary, :status, :sort_order
                )
                RETURNING *
                """
            ),
            {
                "election_id": election_id,
                "name": data["name"],
                "slogan": data.get("slogan") or "",
                "color": data.get("color"),
                "description": data.get("description") or "",
                "work_plan_summary": data.get("work_plan_summary") or "",
                "status": data.get("status") or "borrador",
                "sort_order": order_row["next"] if order_row else 1,
            },
        ).mappings().first()
        self.session.commit()
        assert row is not None
        return self._hydrate_list(row)

    def update_list(self, lista: ElectionList) -> ElectionList:
        self.session.execute(
            text(
                """
                UPDATE election_lists SET
                    name = :name,
                    slogan = :slogan,
                    color = :color,
                    logo_url = :logo_url,
                    description = :description,
                    work_plan_url = :work_plan_url,
                    work_plan_summary = :work_plan_summary,
                    backing_document_url = :backing_document_url,
                    status = :status,
                    sort_order = :sort_order,
                    updated_at = NOW()
                WHERE id = :id
                """
            ),
            {
                "id": lista.id,
                "name": lista.name,
                "slogan": lista.slogan,
                "color": lista.color,
                "logo_url": lista.logo_url,
                "description": lista.description,
                "work_plan_url": lista.work_plan_url,
                "work_plan_summary": lista.work_plan_summary,
                "backing_document_url": lista.backing_document_url,
                "status": lista.status,
                "sort_order": lista.sort_order,
            },
        )
        self.session.commit()
        updated = self.get_list(lista.id)
        assert updated is not None
        return updated

    def delete_list(self, list_id: int) -> None:
        self.session.execute(text("DELETE FROM election_candidates WHERE list_id = :id"), {"id": list_id})
        self.session.execute(text("DELETE FROM election_lists WHERE id = :id"), {"id": list_id})
        self.session.commit()

    def list_has_votes(self, list_id: int) -> bool:
        row = self.session.execute(
            text("SELECT 1 FROM election_votes WHERE list_id = :id LIMIT 1"),
            {"id": list_id},
        ).first()
        return row is not None

    def upsert_candidate(self, list_id: int, data: dict) -> ElectionCandidate:
        if data.get("id"):
            row = self.session.execute(
                text(
                    """
                    UPDATE election_candidates SET
                        position_id = :position_id,
                        full_name = :full_name,
                        profession = :profession,
                        short_profile = :short_profile,
                        photo_url = :photo_url,
                        sort_order = :sort_order
                    WHERE id = :id AND list_id = :list_id
                    RETURNING *
                    """
                ),
                {**data, "list_id": list_id},
            ).mappings().first()
        else:
            row = self.session.execute(
                text(
                    """
                    INSERT INTO election_candidates (
                        list_id, position_id, full_name, profession, short_profile, photo_url, sort_order
                    ) VALUES (
                        :list_id, :position_id, :full_name, :profession, :short_profile, :photo_url, :sort_order
                    )
                    ON CONFLICT (list_id, position_id) DO UPDATE SET
                        full_name = EXCLUDED.full_name,
                        profession = EXCLUDED.profession,
                        short_profile = EXCLUDED.short_profile,
                        photo_url = COALESCE(EXCLUDED.photo_url, election_candidates.photo_url),
                        sort_order = EXCLUDED.sort_order
                    RETURNING *
                    """
                ),
                {**data, "list_id": list_id},
            ).mappings().first()
        self.session.commit()
        assert row is not None
        return self._candidate_from_row(row)

    def delete_candidate(self, candidate_id: int) -> None:
        self.session.execute(text("DELETE FROM election_candidates WHERE id = :id"), {"id": candidate_id})
        self.session.commit()

    def replace_templates(self, election_id: int, templates: list[MessageTemplate]) -> list[MessageTemplate]:
        for item in templates:
            self.session.execute(
                text(
                    """
                    UPDATE election_message_templates SET
                        title = :title,
                        subject = :subject,
                        body = :body,
                        channel_email = :channel_email,
                        channel_portal = :channel_portal,
                        channel_internal = :channel_internal
                    WHERE election_id = :election_id AND template_key = :template_key
                    """
                ),
                {
                    "election_id": election_id,
                    "template_key": item.template_key,
                    "title": item.title,
                    "subject": item.subject,
                    "body": item.body,
                    "channel_email": item.channel_email,
                    "channel_portal": item.channel_portal,
                    "channel_internal": item.channel_internal,
                },
            )
        self.session.commit()
        return self._load_templates(election_id)

    def list_voters(
        self,
        election_id: int,
        *,
        q: str,
        payment_status: str | None,
        enabled: bool | None,
        page: int,
        page_size: int,
        today: date,
    ) -> VoterListResult:
        all_voters = self.list_all_voters(election_id, today)
        filtered = all_voters
        needle = (q or "").strip().lower()
        if needle:
            filtered = [
                item
                for item in filtered
                if needle in f"{item.names} {item.lastname} {item.identifier} {item.email} {item.member_code}".lower()
            ]
        if payment_status:
            if payment_status == "al_dia":
                filtered = [item for item in filtered if item.payment_status in {SUBSCRIPTION_AL_DIA, SUBSCRIPTION_GRACIA}]
            elif payment_status == "pendiente":
                filtered = [item for item in filtered if item.payment_status not in {SUBSCRIPTION_AL_DIA, SUBSCRIPTION_GRACIA}]
        if enabled is not None:
            filtered = [item for item in filtered if item.voting_enabled is enabled]
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)
        start = (page - 1) * page_size
        enabled_count = sum(1 for item in all_voters if item.voting_enabled)
        pending_payment = sum(
            1 for item in all_voters if item.payment_status not in {SUBSCRIPTION_AL_DIA, SUBSCRIPTION_GRACIA}
        )
        return VoterListResult(
            items=filtered[start : start + page_size],
            total=len(filtered),
            enabled_count=enabled_count,
            disabled_count=len(all_voters) - enabled_count,
            pending_payment_count=pending_payment,
            padro_total=len(all_voters),
        )

    def get_voter(self, election_id: int, user_id: int, today: date) -> ElectionVoter | None:
        for item in self.list_all_voters(election_id, today):
            if item.user_id == user_id:
                return item
        return None

    def set_voter_enabled(self, election_id: int, user_id: int, enabled: bool) -> ElectionVoter:
        self.session.execute(
            text(
                """
                INSERT INTO election_voters (election_id, user_id, voting_enabled)
                VALUES (:election_id, :user_id, :enabled)
                ON CONFLICT (election_id, user_id)
                DO UPDATE SET voting_enabled = EXCLUDED.voting_enabled
                """
            ),
            {"election_id": election_id, "user_id": user_id, "enabled": enabled},
        )
        self.session.commit()
        voter = self.get_voter(election_id, user_id, date.today())
        assert voter is not None
        return voter

    def sync_voters(self, election_id: int, today: date) -> VoterListResult:
        members = self._member_rows()
        existing = {
            row["user_id"]: row["voting_enabled"]
            for row in self.session.execute(
                text("SELECT user_id, voting_enabled FROM election_voters WHERE election_id = :id"),
                {"id": election_id},
            ).mappings()
        }
        for member in members:
            if member["user_id"] in existing:
                continue
            status = subscription_status_label(member["coverage_until"], today)
            enabled = status in {SUBSCRIPTION_AL_DIA, SUBSCRIPTION_GRACIA}
            self.session.execute(
                text(
                    """
                    INSERT INTO election_voters (election_id, user_id, voting_enabled)
                    VALUES (:election_id, :user_id, :enabled)
                    ON CONFLICT (election_id, user_id) DO NOTHING
                    """
                ),
                {"election_id": election_id, "user_id": member["user_id"], "enabled": enabled},
            )
        self.session.commit()
        return self.list_voters(election_id, q="", payment_status=None, enabled=None, page=1, page_size=8, today=today)

    def list_all_voters(self, election_id: int, today: date) -> list[ElectionVoter]:
        voted = {
            row[0]
            for row in self.session.execute(
                text("SELECT user_id FROM election_ballots WHERE election_id = :id"),
                {"id": election_id},
            )
        }
        enabled_map = {
            row["user_id"]: row["voting_enabled"]
            for row in self.session.execute(
                text("SELECT user_id, voting_enabled FROM election_voters WHERE election_id = :id"),
                {"id": election_id},
            ).mappings()
        }
        voters: list[ElectionVoter] = []
        for member in self._member_rows():
            status = subscription_status_label(member["coverage_until"], today)
            user_id = member["user_id"]
            voters.append(
                ElectionVoter(
                    user_id=user_id,
                    names=member["names"] or "",
                    lastname=member["lastname"] or "",
                    identifier=member["identifier"] or "",
                    member_code=member["cod"] or f"S-{user_id:04d}",
                    profession=member["title_academic"] or "",
                    email=member["email"] or "",
                    photo_url=member["foto_id"] or None,
                    last_access=member["last_conexion"],
                    payment_status=status,
                    voting_enabled=bool(enabled_map.get(user_id, False)),
                    has_voted=user_id in voted,
                    province=member["province"] or "",
                    city=member["city"] or "",
                )
            )
        return voters

    def has_voted(self, election_id: int, user_id: int) -> bool:
        row = self.session.execute(
            text("SELECT 1 FROM election_ballots WHERE election_id = :election_id AND user_id = :user_id"),
            {"election_id": election_id, "user_id": user_id},
        ).first()
        return row is not None

    def create_ballot(self, election_id: int, user_id: int, receipt_hash: str, votes: list[dict]) -> int:
        row = self.session.execute(
            text(
                """
                INSERT INTO election_ballots (election_id, user_id, receipt_hash)
                VALUES (:election_id, :user_id, :receipt_hash)
                RETURNING id
                """
            ),
            {"election_id": election_id, "user_id": user_id, "receipt_hash": receipt_hash},
        ).mappings().first()
        assert row is not None
        ballot_id = row["id"]
        for vote in votes:
            self.session.execute(
                text(
                    """
                    INSERT INTO election_votes (election_id, ballot_id, list_id, position_id, is_blank)
                    VALUES (:election_id, :ballot_id, :list_id, :position_id, :is_blank)
                    """
                ),
                {
                    "election_id": election_id,
                    "ballot_id": ballot_id,
                    "list_id": vote.get("list_id"),
                    "position_id": vote.get("position_id"),
                    "is_blank": vote.get("is_blank", False),
                },
            )
        self.session.commit()
        return ballot_id

    def count_votes(self, election_id: int) -> int:
        row = self.session.execute(
            text("SELECT COUNT(*) AS total FROM election_ballots WHERE election_id = :id"),
            {"id": election_id},
        ).mappings().first()
        return int(row["total"]) if row else 0

    def build_report(self, election: Election, today: date) -> ElectionReport:
        voters = self.list_all_voters(election.id, today)
        eligible = sum(1 for item in voters if item.voting_enabled)
        votes_cast = self.count_votes(election.id)
        blank_row = self.session.execute(
            text(
                """
                SELECT COUNT(*) AS total
                FROM election_votes
                WHERE election_id = :id AND is_blank = TRUE
                """
            ),
            {"id": election.id},
        ).mappings().first()
        blank_votes = int(blank_row["total"]) if blank_row else 0
        lists = [item for item in self.list_lists(election.id) if item.status == "activa"]
        vote_rows = self.session.execute(
            text(
                """
                SELECT list_id, COUNT(*) AS total
                FROM election_votes
                WHERE election_id = :id AND is_blank = FALSE AND list_id IS NOT NULL
                GROUP BY list_id
                """
            ),
            {"id": election.id},
        ).mappings()
        votes_by_list = {row["list_id"]: int(row["total"]) for row in vote_rows}
        total_for_pct = max(votes_cast, 1)
        rows: list[ReportListRow] = []
        winner_votes = max(votes_by_list.values(), default=0)
        for lista in lists:
            principal = next((item.full_name for item in lista.candidates), "—")
            votes = votes_by_list.get(lista.id, 0)
            rows.append(
                ReportListRow(
                    list_id=lista.id,
                    name=lista.name,
                    slogan=lista.slogan,
                    color=lista.color,
                    logo_url=lista.logo_url,
                    principal_name=principal,
                    votes=votes,
                    percentage=round((votes / total_for_pct) * 100, 1) if votes_cast else 0.0,
                    result_status="Ganadora" if votes and votes == winner_votes else "Participante",
                )
            )
        rows.append(
            ReportListRow(
                list_id=None,
                name="Voto en blanco",
                slogan="",
                color=None,
                logo_url=None,
                principal_name="—",
                votes=blank_votes,
                percentage=round((blank_votes / total_for_pct) * 100, 1) if votes_cast else 0.0,
                result_status="N/A",
            )
        )
        timeline = [
            ReportTimelineItem("apertura", "Apertura de votación", _as_dt(election.voting_starts_on), "Inicio del sufragio", "ok"),
            ReportTimelineItem("cierre", "Cierre de votación", _as_dt(election.voting_ends_on), "Fin del sufragio", "ok"),
            ReportTimelineItem("votos", "Total de votos registrados", datetime.now() if votes_cast else None, f"{votes_cast} votos", "ok"),
            ReportTimelineItem("incidencias", "Incidencias", None, "Sin incidencias registradas", "warn"),
            ReportTimelineItem(
                "validacion",
                "Validación del escrutinio",
                datetime.now() if election.status in {"cerrada", "finalizada"} else None,
                "Cierre de actas" if election.status in {"cerrada", "finalizada"} else "Pendiente",
                "ok" if election.status in {"cerrada", "finalizada"} else "muted",
            ),
        ]
        return ElectionReport(
            election_id=election.id,
            title=election.title,
            status=election.status,
            eligible=eligible,
            votes_cast=votes_cast,
            participation=round((votes_cast / eligible) * 100, 1) if eligible else 0.0,
            blank_votes=blank_votes,
            blank_percentage=round((blank_votes / total_for_pct) * 100, 1) if votes_cast else 0.0,
            lists_count=len(lists),
            updated_at=election.updated_at,
            rows=rows,
            timeline=timeline,
        )

    def add_notice(self, election_id: int, user_id: int | None, template_key: str, title: str, body: str) -> None:
        self.session.execute(
            text(
                """
                INSERT INTO election_notices (election_id, user_id, template_key, title, body)
                VALUES (:election_id, :user_id, :template_key, :title, :body)
                """
            ),
            {
                "election_id": election_id,
                "user_id": user_id,
                "template_key": template_key,
                "title": title,
                "body": body,
            },
        )
        self.session.commit()

    def list_notices(self, election_id: int, user_id: int) -> list[ElectionNotice]:
        rows = self.session.execute(
            text(
                """
                SELECT id, title, body, created_at
                FROM election_notices
                WHERE election_id = :election_id
                  AND (user_id = :user_id OR user_id IS NULL)
                ORDER BY created_at DESC
                LIMIT 20
                """
            ),
            {"election_id": election_id, "user_id": user_id},
        ).mappings()
        return [
            ElectionNotice(id=row["id"], title=row["title"], body=row["body"], created_at=row["created_at"])
            for row in rows
        ]

    def add_message_log(self, election_id: int, template_key: str, channel: str, recipient: str) -> None:
        self.session.execute(
            text(
                """
                INSERT INTO election_message_logs (election_id, template_key, channel, recipient)
                VALUES (:election_id, :template_key, :channel, :recipient)
                """
            ),
            {
                "election_id": election_id,
                "template_key": template_key,
                "channel": channel,
                "recipient": recipient,
            },
        )
        self.session.commit()

    def member_emails(self, election_id: int, only_enabled: bool, only_pending_vote: bool) -> list[tuple[int, str, str]]:
        voters = self.list_all_voters(election_id, date.today())
        result: list[tuple[int, str, str]] = []
        for item in voters:
            if only_enabled and not item.voting_enabled:
                continue
            if only_pending_vote and item.has_voted:
                continue
            result.append((item.user_id, f"{item.names} {item.lastname}".strip(), item.email))
        return result

    def _member_rows(self) -> list[Any]:
        return list(
            self.session.execute(
                text(
                    """
                    SELECT
                        u.id AS user_id,
                        COALESCE(p.names, u.name, '') AS names,
                        COALESCE(p.lastname, '') AS lastname,
                        COALESCE(p.identifier, '') AS identifier,
                        COALESCE(p.cod, '') AS cod,
                        COALESCE(p.title_academic, '') AS title_academic,
                        COALESCE(p.email, u.email, '') AS email,
                        COALESCE(p.foto_id, '') AS foto_id,
                        u.last_conexion,
                        p.province,
                        p.city,
                        s.coverage_until
                    FROM users u
                    INNER JOIN model_has_roles mhr
                        ON mhr.model_id = u.id
                       AND mhr.model_type = :model_type
                    INNER JOIN roles r ON r.id = mhr.role_id
                    LEFT JOIN profiles p ON p.user_id = u.id
                    LEFT JOIN member_subscriptions s ON s.user_id = u.id
                    WHERE r.name = :member_role
                      AND p.deleted_at IS NULL
                    ORDER BY p.names, p.lastname, u.id
                    """
                ),
                {"model_type": USER_MODEL_TYPE, "member_role": MEMBER_ROLE_NAME},
            ).mappings()
        )

    def _load_positions(self, election_id: int) -> list[ElectionPosition]:
        rows = self.session.execute(
            text("SELECT * FROM election_positions WHERE election_id = :id ORDER BY sort_order, id"),
            {"id": election_id},
        ).mappings()
        return [self._position_from_row(row) for row in rows]

    def _load_calendar(self, election_id: int) -> list[CalendarEvent]:
        rows = self.session.execute(
            text("SELECT * FROM election_calendar_events WHERE election_id = :id ORDER BY sort_order"),
            {"id": election_id},
        ).mappings()
        return [
            CalendarEvent(
                id=row["id"],
                election_id=row["election_id"],
                event_key=row["event_key"],
                title=row["title"],
                starts_on=row["starts_on"],
                ends_on=row["ends_on"],
                sort_order=row["sort_order"],
            )
            for row in rows
        ]

    def _load_templates(self, election_id: int) -> list[MessageTemplate]:
        rows = self.session.execute(
            text("SELECT * FROM election_message_templates WHERE election_id = :id"),
            {"id": election_id},
        ).mappings()
        return [
            MessageTemplate(
                id=row["id"],
                election_id=row["election_id"],
                template_key=row["template_key"],
                title=row["title"],
                subject=row["subject"],
                body=row["body"],
                channel_email=row["channel_email"],
                channel_portal=row["channel_portal"],
                channel_internal=row["channel_internal"],
            )
            for row in rows
        ]

    def _hydrate_list(self, row: Any) -> ElectionList:
        lista = ElectionList(
            id=row["id"],
            election_id=row["election_id"],
            name=row["name"],
            slogan=row["slogan"] or "",
            color=row["color"],
            logo_url=row["logo_url"],
            description=row["description"] or "",
            work_plan_url=row["work_plan_url"],
            work_plan_summary=row["work_plan_summary"] or "",
            backing_document_url=row["backing_document_url"],
            status=row["status"],
            sort_order=row["sort_order"],
        )
        candidate_rows = self.session.execute(
            text(
                """
                SELECT c.*, p.name AS position_name
                FROM election_candidates c
                INNER JOIN election_positions p ON p.id = c.position_id
                WHERE c.list_id = :id
                ORDER BY c.sort_order, c.id
                """
            ),
            {"id": lista.id},
        ).mappings()
        lista.candidates = [self._candidate_from_row(item) for item in candidate_rows]
        return lista

    def _candidate_from_row(self, row: Any) -> ElectionCandidate:
        return ElectionCandidate(
            id=row["id"],
            list_id=row["list_id"],
            position_id=row["position_id"],
            position_name=row.get("position_name") or "",
            full_name=row["full_name"],
            profession=row["profession"] or "",
            short_profile=row["short_profile"] or "",
            photo_url=row["photo_url"],
            sort_order=row["sort_order"],
        )

    def _position_from_row(self, row: Any) -> ElectionPosition:
        return ElectionPosition(
            id=row["id"],
            election_id=row["election_id"],
            name=row["name"],
            sort_order=row["sort_order"],
            is_active=row["is_active"],
            photo_required=row["photo_required"],
            full_name_required=row["full_name_required"],
            short_profile_required=row["short_profile_required"],
            profession_required=row["profession_required"],
            visible_to_members=row["visible_to_members"],
        )

    def _election_from_row(self, row: Any) -> Election:
        return Election(
            id=row["id"],
            title=row["title"],
            subtitle=row["subtitle"] or "",
            tagline=row["tagline"] or "",
            status=row["status"],
            voting_starts_on=row["voting_starts_on"],
            voting_ends_on=row["voting_ends_on"],
            term_starts_on=row["term_starts_on"],
            term_ends_on=row["term_ends_on"],
            calendar_public=row["calendar_public"],
            work_plan_required=row["work_plan_required"],
            photo_required=row["photo_required"],
            accept_position_required=row["accept_position_required"],
            list_logo_enabled=row["list_logo_enabled"],
            list_color_required=row["list_color_required"],
            backing_document_required=row["backing_document_required"],
            registration_deadline=row["registration_deadline"],
            max_file_mb=row["max_file_mb"],
            show_work_plan=row["show_work_plan"],
            show_all_photos=row["show_all_photos"],
            show_process_status=row["show_process_status"],
            members_only=row["members_only"],
            auto_publish_on_vote_start=row["auto_publish_on_vote_start"],
            publish_from=row["publish_from"],
            publish_until=row["publish_until"],
            logo_url=row["logo_url"],
            banner_url=row["banner_url"],
            primary_color=row["primary_color"],
            secondary_color=row["secondary_color"],
            election_type=row["election_type"],
            one_vote_per_member=row["one_vote_per_member"],
            secret_vote=row["secret_vote"],
            confirm_vote=row["confirm_vote"],
            allow_blank_vote=row["allow_blank_vote"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )


def _as_dt(value: date | None) -> datetime | None:
    if value is None:
        return None
    return datetime.combine(value, datetime.min.time())


# Keep import used by sequence helpers if tables are created empty in tests.
_ = sync_serial_sequence
