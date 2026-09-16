from datetime import date
from hashlib import sha256
from uuid import uuid4

from app.modules.votaciones.application.ports import (
    ElectionFileStorage,
    ElectionNotifier,
    ElectionPdfGenerator,
    ElectionsRepository,
)
from app.modules.votaciones.domain.entities import (
    CALENDAR_KEYS,
    CLOSED_STATUSES,
    MESSAGE_KEYS,
    SINGLE_DATE_CALENDAR_KEYS,
    CalendarEvent,
    Election,
    ElectionCandidate,
    ElectionList,
    ElectionPosition,
    ElectionReport,
    ElectionSummary,
    ElectionVoter,
    GuideStep,
    MemberPortal,
    MessageTemplate,
    VoteChoice,
    VoterListResult,
)
from app.modules.votaciones.domain.exceptions import (
    ElectionConflictError,
    ElectionForbiddenError,
    ElectionNotFoundError,
    ElectionValidationError,
)
from app.modules.votaciones.domain.rules import (
    assert_hex_color,
    assert_rules_editable,
    assert_writable,
    can_member_see_lists,
    is_readonly_status,
    is_voting_open,
    normalize_election_type,
    normalize_list_status,
    position_by_id,
    render_template,
    validate_candidate_fields,
    validate_list_activation,
    voting_window,
)


def _today() -> date:
    return date.today()


def build_guide(election: Election, lists_count: int, voters_count: int, votes_count: int) -> list[GuideStep]:
    calendar_ready = all(event.starts_on for event in election.calendar)
    return [
        GuideStep("positions", "Configura cargos y requisitos", "/admin/votaciones/configuracion?panel=cargos", any(item.is_active for item in election.positions)),
        GuideStep("design", "Define diseño y opciones de voto", "/admin/votaciones/configuracion?panel=diseno", bool(election.title.strip())),
        GuideStep("calendar", "Carga las 9 fechas del calendario", "/admin/votaciones/calendario", calendar_ready),
        GuideStep("lists", "Registra las listas con los cargos definidos", "/admin/votaciones/listas", lists_count > 0),
        GuideStep("voters", "Sincroniza el padrón de votantes", "/admin/votaciones/votantes", voters_count > 0),
        GuideStep("open", "Publica o abre la votación", "/admin/votaciones/configuracion?panel=general", election.status in {"publicada", "en_votacion"}),
        GuideStep("reports", "Consulta reportes y cierra el periodo", "/admin/votaciones/reportes", votes_count > 0 or election.status in CLOSED_STATUSES),
    ]


class GetOrCreateElectionUseCase:
    def __init__(self, repository: ElectionsRepository) -> None:
        self.repository = repository

    def execute(self, election_id: int | None = None) -> tuple[Election, list[ElectionSummary], list[GuideStep], bool]:
        if election_id is not None:
            election = self.repository.get_election(election_id)
            if election is None:
                raise ElectionNotFoundError("Periodo no encontrado.")
        else:
            election = self.repository.get_open_election()
            if election is None:
                summaries = self.repository.list_summaries()
                if summaries:
                    election = self.repository.get_election(summaries[0].id)
                if election is None:
                    election = self.repository.create_election("Elección de la Directiva")
        summaries = self.repository.list_summaries()
        lists = self.repository.list_lists(election.id)
        voters = self.repository.list_all_voters(election.id, _today())
        votes = self.repository.count_votes(election.id)
        return election, summaries, build_guide(election, len(lists), len(voters), votes), is_readonly_status(election.status)


class UpdateElectionUseCase:
    def __init__(self, repository: ElectionsRepository) -> None:
        self.repository = repository

    def execute(self, election_id: int, payload: dict) -> Election:
        election = _require_election(self.repository, election_id)
        assert_writable(election)
        if any(key in payload for key in ("election_type", "allow_blank_vote", "secret_vote", "confirm_vote")):
            if election.status == "en_votacion":
                assert_rules_editable(election)

        updates = dict(payload)
        if "primary_color" in updates and updates["primary_color"]:
            updates["primary_color"] = assert_hex_color(updates["primary_color"], "color principal")
        if "secondary_color" in updates and updates["secondary_color"]:
            updates["secondary_color"] = assert_hex_color(updates["secondary_color"], "color secundario")
        if "election_type" in updates:
            updates["election_type"] = normalize_election_type(updates["election_type"])
        if "max_file_mb" in updates:
            size = int(updates["max_file_mb"])
            if size < 1 or size > 20:
                raise ElectionValidationError("El tamaño máximo de archivo debe estar entre 1 y 20 MB.")
            updates["max_file_mb"] = size
        if "status" in updates and updates["status"] not in {
            "en_preparacion",
            "publicada",
            "en_votacion",
            "cerrada",
            "finalizada",
        }:
            raise ElectionValidationError("Estado de elección inválido.")

        for field_name, value in updates.items():
            if hasattr(election, field_name):
                setattr(election, field_name, value)
        return self.repository.update_election(election)


class CloseElectionUseCase:
    def __init__(self, repository: ElectionsRepository) -> None:
        self.repository = repository

    def execute(self, election_id: int) -> Election:
        election = _require_election(self.repository, election_id)
        if is_readonly_status(election.status):
            raise ElectionConflictError("Este periodo ya está cerrado.")
        status = "finalizada" if self.repository.count_votes(election.id) > 0 else "cerrada"
        return self.repository.close_election(election.id, status)


class StartElectionUseCase:
    def __init__(self, repository: ElectionsRepository) -> None:
        self.repository = repository

    def execute(self, title: str | None = None) -> Election:
        if self.repository.get_open_election() is not None:
            raise ElectionConflictError("Cierra el periodo vigente antes de iniciar uno nuevo.")
        return self.repository.create_election(title or "Elección de la Directiva")


class SavePositionsUseCase:
    def __init__(self, repository: ElectionsRepository) -> None:
        self.repository = repository

    def create(self, election_id: int, name: str) -> ElectionPosition:
        election = _require_election(self.repository, election_id)
        assert_writable(election)
        clean = name.strip()
        if not clean:
            raise ElectionValidationError("El nombre del cargo es obligatorio.")
        order = max((item.sort_order for item in election.positions), default=0) + 1
        return self.repository.add_position(election.id, clean, order)

    def update(self, election_id: int, position_id: int, payload: dict) -> ElectionPosition:
        election = _require_election(self.repository, election_id)
        assert_writable(election)
        position = position_by_id(election, position_id)
        if "name" in payload and payload["name"] is not None:
            position.name = str(payload["name"]).strip() or position.name
        for flag in (
            "is_active",
            "photo_required",
            "full_name_required",
            "short_profile_required",
            "profession_required",
            "visible_to_members",
        ):
            if flag in payload and payload[flag] is not None:
                setattr(position, flag, bool(payload[flag]))
        if "sort_order" in payload and payload["sort_order"] is not None:
            position.sort_order = int(payload["sort_order"])
        return self.repository.update_position(position)

    def reorder(self, election_id: int, ids: list[int]) -> Election:
        election = _require_election(self.repository, election_id)
        assert_writable(election)
        self.repository.reorder_positions(election.id, ids)
        return _require_election(self.repository, election_id)

    def delete(self, election_id: int, position_id: int) -> None:
        election = _require_election(self.repository, election_id)
        assert_writable(election)
        position_by_id(election, position_id)
        if self.repository.position_in_use(position_id):
            raise ElectionConflictError("No se puede eliminar un cargo en uso. Desactívalo.")
        self.repository.delete_position(position_id)


class SaveCalendarUseCase:
    def __init__(self, repository: ElectionsRepository) -> None:
        self.repository = repository

    def save(self, election_id: int, events: list[dict]) -> list[CalendarEvent]:
        election = _require_election(self.repository, election_id)
        assert_writable(election)
        mapped: list[CalendarEvent] = []
        by_key = {item["event_key"]: item for item in events}
        for key, title, order in CALENDAR_KEYS:
            incoming = by_key.get(key, {})
            starts_on = _parse_date(incoming.get("starts_on"))
            ends_on = None if key in SINGLE_DATE_CALENDAR_KEYS else _parse_date(incoming.get("ends_on"))
            mapped.append(
                CalendarEvent(
                    id=0,
                    election_id=election.id,
                    event_key=key,
                    title=str(incoming.get("title") or title),
                    starts_on=starts_on,
                    ends_on=ends_on,
                    sort_order=order,
                )
            )
        saved = self.repository.replace_calendar(election.id, mapped)
        voting = next((item for item in saved if item.event_key == "votacion"), None)
        term_start = next((item for item in saved if item.event_key == "inicio_gestion"), None)
        term_end = next((item for item in saved if item.event_key == "fin_gestion"), None)
        election.voting_starts_on = voting.starts_on if voting else election.voting_starts_on
        election.voting_ends_on = (voting.ends_on or voting.starts_on) if voting else election.voting_ends_on
        election.term_starts_on = term_start.starts_on if term_start else election.term_starts_on
        election.term_ends_on = term_end.starts_on if term_end else election.term_ends_on
        self.repository.update_election(election)
        return saved

    def publish(self, election_id: int, is_public: bool) -> Election:
        election = _require_election(self.repository, election_id)
        assert_writable(election)
        return self.repository.set_calendar_public(election.id, is_public)


class ManageListsUseCase:
    def __init__(self, repository: ElectionsRepository) -> None:
        self.repository = repository

    def list_items(self, election_id: int) -> list[ElectionList]:
        _require_election(self.repository, election_id)
        return self.repository.list_lists(election_id)

    def get(self, list_id: int) -> ElectionList:
        lista = self.repository.get_list(list_id)
        if lista is None:
            raise ElectionNotFoundError("Lista no encontrada.")
        return lista

    def create(self, election_id: int, payload: dict) -> ElectionList:
        election = _require_election(self.repository, election_id)
        assert_writable(election)
        name = str(payload.get("name") or "").strip()
        if not name:
            raise ElectionValidationError("El nombre de la lista es obligatorio.")
        color = payload.get("color")
        if color:
            color = assert_hex_color(str(color), "color de la lista")
        return self.repository.create_list(
            election.id,
            {
                "name": name,
                "slogan": str(payload.get("slogan") or "").strip(),
                "color": color,
                "description": str(payload.get("description") or "")[:900],
                "work_plan_summary": str(payload.get("work_plan_summary") or ""),
                "status": "borrador",
            },
        )

    def update(self, election_id: int, list_id: int, payload: dict) -> ElectionList:
        election = _require_election(self.repository, election_id)
        assert_writable(election)
        lista = self.get(list_id)
        if lista.election_id != election.id:
            raise ElectionNotFoundError("Lista no encontrada.")
        if "name" in payload:
            lista.name = str(payload.get("name") or "").strip()
            if not lista.name:
                raise ElectionValidationError("El nombre de la lista es obligatorio.")
        if "slogan" in payload:
            lista.slogan = str(payload.get("slogan") or "").strip()
        if "description" in payload:
            lista.description = str(payload.get("description") or "")[:900]
        if "work_plan_summary" in payload:
            lista.work_plan_summary = str(payload.get("work_plan_summary") or "")
        if "color" in payload and payload["color"]:
            lista.color = assert_hex_color(str(payload["color"]), "color de la lista")
        if "sort_order" in payload and payload["sort_order"] is not None:
            lista.sort_order = int(payload["sort_order"])
        if "status" in payload and payload["status"] is not None:
            next_status = normalize_list_status(str(payload["status"]))
            if next_status == "activa":
                validate_list_activation(election, lista)
            lista.status = next_status
        return self.repository.update_list(lista)

    def delete(self, election_id: int, list_id: int) -> None:
        election = _require_election(self.repository, election_id)
        assert_writable(election)
        lista = self.get(list_id)
        if lista.election_id != election.id:
            raise ElectionNotFoundError("Lista no encontrada.")
        if self.repository.list_has_votes(list_id):
            raise ElectionConflictError("No se puede eliminar una lista con votos. Márcala como retirada.")
        self.repository.delete_list(list_id)

    def save_candidate(self, election_id: int, list_id: int, payload: dict, candidate_id: int | None = None) -> ElectionCandidate:
        election = _require_election(self.repository, election_id)
        assert_writable(election)
        lista = self.get(list_id)
        position = position_by_id(election, int(payload["position_id"]))
        if not position.is_active:
            raise ElectionValidationError("Ese cargo no está activo en la configuración.")
        full_name = str(payload.get("full_name") or "").strip()
        profession = str(payload.get("profession") or "").strip()
        short_profile = str(payload.get("short_profile") or "").strip()
        photo_url = payload.get("photo_url") or None
        existing = next((item for item in lista.candidates if item.id == candidate_id), None) if candidate_id else None
        if existing and not photo_url:
            photo_url = existing.photo_url
        if lista.status == "activa":
            validate_candidate_fields(
                election,
                position,
                full_name=full_name,
                profession=profession,
                short_profile=short_profile,
                photo_url=photo_url,
            )
        elif position.full_name_required and not full_name:
            raise ElectionValidationError("El nombre completo es obligatorio.")
        return self.repository.upsert_candidate(
            list_id,
            {
                "id": candidate_id,
                "position_id": position.id,
                "full_name": full_name,
                "profession": profession,
                "short_profile": short_profile,
                "photo_url": photo_url,
                "sort_order": payload.get("sort_order") or position.sort_order,
            },
        )

    def delete_candidate(self, election_id: int, list_id: int, candidate_id: int) -> None:
        election = _require_election(self.repository, election_id)
        assert_writable(election)
        lista = self.get(list_id)
        if not any(item.id == candidate_id for item in lista.candidates):
            raise ElectionNotFoundError("Candidato no encontrado.")
        self.repository.delete_candidate(candidate_id)


class UploadElectionMediaUseCase:
    def __init__(self, repository: ElectionsRepository, storage: ElectionFileStorage) -> None:
        self.repository = repository
        self.storage = storage

    def election_media(self, election_id: int, kind: str, filename: str, content: bytes, content_type: str) -> str:
        election = _require_election(self.repository, election_id)
        assert_writable(election)
        url = self.storage.save(election.id, kind, filename, content, content_type, election.max_file_mb)
        if kind == "logo":
            election.logo_url = url
        elif kind == "banner":
            election.banner_url = url
        else:
            raise ElectionValidationError("Tipo de archivo de proceso no válido.")
        self.repository.update_election(election)
        return url

    def list_media(self, election_id: int, list_id: int, kind: str, filename: str, content: bytes, content_type: str) -> str:
        election = _require_election(self.repository, election_id)
        assert_writable(election)
        lista = self.repository.get_list(list_id)
        if lista is None or lista.election_id != election.id:
            raise ElectionNotFoundError("Lista no encontrada.")
        url = self.storage.save(election.id, f"list-{kind}", filename, content, content_type, election.max_file_mb)
        if kind == "logo":
            lista.logo_url = url
        elif kind == "work-plan":
            lista.work_plan_url = url
        elif kind == "backing":
            lista.backing_document_url = url
        else:
            raise ElectionValidationError("Tipo de archivo de lista no válido.")
        self.repository.update_list(lista)
        return url

    def candidate_photo(
        self,
        election_id: int,
        list_id: int,
        candidate_id: int,
        filename: str,
        content: bytes,
        content_type: str,
    ) -> str:
        election = _require_election(self.repository, election_id)
        assert_writable(election)
        lista = self.repository.get_list(list_id)
        if lista is None:
            raise ElectionNotFoundError("Lista no encontrada.")
        candidate = next((item for item in lista.candidates if item.id == candidate_id), None)
        if candidate is None:
            raise ElectionNotFoundError("Candidato no encontrado.")
        url = self.storage.save(election.id, "candidate-photo", filename, content, content_type, election.max_file_mb)
        self.repository.upsert_candidate(
            list_id,
            {
                "id": candidate.id,
                "position_id": candidate.position_id,
                "full_name": candidate.full_name,
                "profession": candidate.profession,
                "short_profile": candidate.short_profile,
                "photo_url": url,
                "sort_order": candidate.sort_order,
            },
        )
        return url


class ManageVotersUseCase:
    def __init__(self, repository: ElectionsRepository) -> None:
        self.repository = repository

    def list_items(
        self,
        election_id: int,
        *,
        q: str = "",
        payment_status: str | None = None,
        enabled: bool | None = None,
        page: int = 1,
        page_size: int = 8,
    ) -> VoterListResult:
        _require_election(self.repository, election_id)
        return self.repository.list_voters(
            election_id,
            q=q,
            payment_status=payment_status,
            enabled=enabled,
            page=page,
            page_size=page_size,
            today=_today(),
        )

    def toggle(self, election_id: int, user_id: int, enabled: bool) -> Election:
        election = _require_election(self.repository, election_id)
        assert_writable(election)
        self.repository.set_voter_enabled(election.id, user_id, enabled)
        return election

    def sync(self, election_id: int) -> VoterListResult:
        election = _require_election(self.repository, election_id)
        assert_writable(election)
        return self.repository.sync_voters(election.id, _today())

    def export_rows(self, election_id: int) -> list[ElectionVoter]:
        _require_election(self.repository, election_id)
        return self.repository.list_all_voters(election_id, _today())


class SaveMessagesUseCase:
    def __init__(self, repository: ElectionsRepository, notifier: ElectionNotifier) -> None:
        self.repository = repository
        self.notifier = notifier

    def save(self, election_id: int, templates: list[dict]) -> list[MessageTemplate]:
        election = _require_election(self.repository, election_id)
        assert_writable(election)
        mapped: list[MessageTemplate] = []
        incoming = {item.get("template_key"): item for item in templates}
        for key, title, subject, body in MESSAGE_KEYS:
            data = incoming.get(key, {})
            mapped.append(
                MessageTemplate(
                    id=0,
                    election_id=election.id,
                    template_key=key,
                    title=str(data.get("title") or title),
                    subject=str(data.get("subject") or subject)[:180],
                    body=str(data.get("body") or body)[:500],
                    channel_email=bool(data.get("channel_email", True)),
                    channel_portal=bool(data.get("channel_portal", True)),
                    channel_internal=bool(data.get("channel_internal", False)),
                )
            )
        return self.repository.replace_templates(election.id, mapped)

    def test(self, election_id: int, template_key: str, email: str) -> None:
        election = _require_election(self.repository, election_id)
        template = _template(election, template_key)
        start, end = voting_window(election)
        subject = render_template(
            template.subject,
            nombre="María López",
            titulo=election.title,
            fecha_inicio=_fmt(start),
            fecha_fin=_fmt(end),
        )
        body = render_template(
            template.body,
            nombre="María López",
            titulo=election.title,
            fecha_inicio=_fmt(start),
            fecha_fin=_fmt(end),
        )
        self.notifier.send(email, subject, body)
        self.repository.add_message_log(election.id, template_key, "email", email)

    def send(self, election_id: int, template_key: str) -> int:
        election = _require_election(self.repository, election_id)
        assert_writable(election)
        template = _template(election, template_key)
        only_pending = template_key == "recordatorio"
        recipients = self.repository.member_emails(election.id, only_enabled=True, only_pending_vote=only_pending)
        start, end = voting_window(election)
        sent = 0
        for user_id, name, email in recipients:
            subject = render_template(template.subject, nombre=name, titulo=election.title, fecha_inicio=_fmt(start), fecha_fin=_fmt(end))
            body = render_template(template.body, nombre=name, titulo=election.title, fecha_inicio=_fmt(start), fecha_fin=_fmt(end))
            if template.channel_email and email:
                self.notifier.send(email, subject, body)
                self.repository.add_message_log(election.id, template_key, "email", email)
            if template.channel_portal or template.channel_internal:
                self.repository.add_notice(election.id, user_id, template_key, subject, body)
                self.repository.add_message_log(election.id, template_key, "portal", email or str(user_id))
            sent += 1
        return sent


class CastVoteUseCase:
    def __init__(self, repository: ElectionsRepository, notifier: ElectionNotifier) -> None:
        self.repository = repository
        self.notifier = notifier

    def execute(self, user_id: int, payload: dict) -> None:
        election = self.repository.get_open_election()
        if election is None:
            raise ElectionConflictError("No hay un periodo de votación abierto.")
        today = _today()
        if not is_voting_open(election, today):
            raise ElectionForbiddenError("La votación no está abierta en este momento.")
        voter = self.repository.get_voter(election.id, user_id, today)
        if voter is None or not voter.voting_enabled:
            raise ElectionForbiddenError("No estás habilitado para votar en este periodo.")
        if self.repository.has_voted(election.id, user_id):
            raise ElectionConflictError("Ya registraste tu voto en este periodo.")

        choices = _normalize_choices(election, payload)
        receipt = sha256(f"{election.id}:{user_id}:{uuid4().hex}".encode("utf-8")).hexdigest()
        votes = [
            {
                "list_id": choice.list_id,
                "position_id": choice.position_id,
                "is_blank": choice.is_blank,
            }
            for choice in choices
        ]
        self.repository.create_ballot(election.id, user_id, receipt, votes)

        template = next((item for item in election.templates if item.template_key == "confirmacion_voto"), None)
        if template and voter.email:
            start, end = voting_window(election)
            subject = render_template(template.subject, nombre=voter.names, titulo=election.title, fecha_inicio=_fmt(start), fecha_fin=_fmt(end))
            body = render_template(template.body, nombre=voter.names, titulo=election.title, fecha_inicio=_fmt(start), fecha_fin=_fmt(end))
            if template.channel_email:
                self.notifier.send(voter.email, subject, body)
            if template.channel_portal or template.channel_internal:
                self.repository.add_notice(election.id, user_id, template.template_key, subject, body)


class GetMemberPortalUseCase:
    def __init__(self, repository: ElectionsRepository) -> None:
        self.repository = repository

    def execute(self, user_id: int, list_id: int | None = None) -> MemberPortal:
        election = self.repository.get_open_election()
        if election is None:
            summaries = self.repository.list_summaries()
            election = self.repository.get_election(summaries[0].id) if summaries else None
        if election is None:
            raise ElectionNotFoundError("Aún no hay un proceso electoral.")
        today = _today()
        lists = [
            item
            for item in self.repository.list_lists(election.id)
            if item.status == "activa" and can_member_see_lists(election, today)
        ]
        if not election.show_all_photos:
            for lista in lists:
                for candidate in lista.candidates:
                    candidate.photo_url = None
        voter = self.repository.get_voter(election.id, user_id, today)
        has_voted = self.repository.has_voted(election.id, user_id) if voter else False
        enabled = bool(voter and voter.voting_enabled)
        portal = MemberPortal(
            election=election,
            lists=lists,
            voting_enabled=enabled,
            has_voted=has_voted,
            can_vote=enabled and not has_voted and is_voting_open(election, today),
            notices=self.repository.list_notices(election.id, user_id),
        )
        if list_id is not None:
            portal.lists = [item for item in lists if item.id == list_id]
            if not portal.lists:
                raise ElectionNotFoundError("Lista no disponible.")
        return portal


class GetReportsUseCase:
    def __init__(self, repository: ElectionsRepository, pdfs: ElectionPdfGenerator) -> None:
        self.repository = repository
        self.pdfs = pdfs

    def snapshot(self, election_id: int) -> ElectionReport:
        election = _require_election(self.repository, election_id)
        return self.repository.build_report(election, _today())

    def export_pdf(self, election_id: int) -> bytes:
        return self.pdfs.report_pdf(self.snapshot(election_id))

    def acta(self, election_id: int) -> bytes:
        return self.pdfs.acta_pdf(self.snapshot(election_id))

    def calendar_pdf(self, election_id: int) -> bytes:
        election = _require_election(self.repository, election_id)
        return self.pdfs.calendar_pdf(election)


class GetPublicCalendarUseCase:
    def __init__(self, repository: ElectionsRepository, pdfs: ElectionPdfGenerator) -> None:
        self.repository = repository
        self.pdfs = pdfs

    def get(self) -> Election | None:
        election = self.repository.get_open_election()
        if election is None or not election.calendar_public:
            return None
        return election

    def download(self) -> bytes:
        election = self.get()
        if election is None:
            raise ElectionNotFoundError("El calendario electoral no está publicado.")
        return self.pdfs.calendar_pdf(election)


def _require_election(repository: ElectionsRepository, election_id: int) -> Election:
    election = repository.get_election(election_id)
    if election is None:
        raise ElectionNotFoundError("Periodo no encontrado.")
    return election


def _template(election: Election, template_key: str) -> MessageTemplate:
    for item in election.templates:
        if item.template_key == template_key:
            return item
    raise ElectionValidationError("Plantilla no encontrada.")


def _parse_date(value: object) -> date | None:
    if value in (None, ""):
        return None
    if isinstance(value, date):
        return value
    text = str(value)
    try:
        return date.fromisoformat(text[:10])
    except ValueError as exc:
        raise ElectionValidationError("La fecha no es válida.") from exc


def _fmt(value: date | None) -> str:
    return value.strftime("%d/%m/%Y") if value else "por definir"


def _normalize_choices(election: Election, payload: dict) -> list[VoteChoice]:
    if payload.get("is_blank"):
        if not election.allow_blank_vote:
            raise ElectionValidationError("El voto en blanco no está permitido.")
        return [VoteChoice(list_id=None, position_id=None, is_blank=True)]

    if election.election_type == "voto_por_cargos":
        raw_choices = payload.get("choices") or []
        if not isinstance(raw_choices, list) or not raw_choices:
            raise ElectionValidationError("Debes votar por cada cargo.")
        active = [item for item in election.positions if item.is_active]
        if len(raw_choices) != len(active):
            raise ElectionValidationError("Debes emitir un voto por cada cargo activo.")
        lists = {item.id: item for item in []}
        result: list[VoteChoice] = []
        seen: set[int] = set()
        for raw in raw_choices:
            position_id = int(raw.get("position_id"))
            if position_id in seen:
                raise ElectionValidationError("Hay un cargo duplicado en la boleta.")
            seen.add(position_id)
            position_by_id(election, position_id)
            if raw.get("is_blank"):
                if not election.allow_blank_vote:
                    raise ElectionValidationError("El voto en blanco no está permitido.")
                result.append(VoteChoice(list_id=None, position_id=position_id, is_blank=True))
                continue
            list_id = int(raw.get("list_id"))
            result.append(VoteChoice(list_id=list_id, position_id=position_id, is_blank=False))
        _ = lists
        return result

    list_id = payload.get("list_id")
    if list_id is None:
        raise ElectionValidationError("Debes seleccionar una lista.")
    return [VoteChoice(list_id=int(list_id), position_id=None, is_blank=False)]
