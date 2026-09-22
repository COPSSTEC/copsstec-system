from datetime import date

from app.modules.votaciones.domain.entities import (
    CLOSED_STATUSES,
    ELECTION_TYPES,
    LIST_STATUSES,
    OPEN_STATUSES,
    CalendarEvent,
    Election,
    ElectionCandidate,
    ElectionList,
    ElectionPosition,
)
from app.modules.votaciones.domain.exceptions import ElectionConflictError, ElectionValidationError


def assert_hex_color(value: str, field: str = "color") -> str:
    text = (value or "").strip().upper()
    if not text.startswith("#"):
        text = f"#{text}"
    if len(text) not in {4, 7} or any(ch not in "#0123456789ABCDEF" for ch in text):
        raise ElectionValidationError(f"El {field} debe ser un color hexadecimal.")
    return text


def is_open_status(status: str) -> bool:
    return status in OPEN_STATUSES


def is_readonly_status(status: str) -> bool:
    return status in CLOSED_STATUSES


def assert_writable(election: Election) -> None:
    if is_readonly_status(election.status):
        raise ElectionConflictError("Este periodo está cerrado y es de solo lectura.")


def assert_rules_editable(election: Election) -> None:
    if election.status in {"en_votacion", "cerrada", "finalizada"}:
        raise ElectionConflictError("No se pueden cambiar las reglas de votación en este estado.")


def normalize_election_type(value: str) -> str:
    normalized = (value or "").strip()
    if normalized not in ELECTION_TYPES:
        raise ElectionValidationError("El tipo de elección no es válido.")
    return normalized


def normalize_list_status(value: str) -> str:
    normalized = (value or "").strip()
    if normalized not in LIST_STATUSES:
        raise ElectionValidationError("El estado de la lista no es válido.")
    return normalized


def voting_window(election: Election) -> tuple[date | None, date | None]:
    start = election.voting_starts_on
    end = election.voting_ends_on
    for event in election.calendar:
        if event.event_key == "votacion":
            start = event.starts_on or start
            end = event.ends_on or event.starts_on or end
    return start, end


def is_voting_open(election: Election, today: date) -> bool:
    if election.status == "en_votacion":
        start, end = voting_window(election)
        if start and today < start:
            return False
        if end and today > end:
            return False
        return True
    if election.auto_publish_on_vote_start and election.status == "publicada":
        start, end = voting_window(election)
        if start is None:
            return False
        if today < start:
            return False
        if end and today > end:
            return False
        return True
    return False


def can_member_see_lists(election: Election, today: date) -> bool:
    if election.status in CLOSED_STATUSES:
        return False
    if election.publish_from and today < election.publish_from:
        return False
    if election.publish_until and today > election.publish_until:
        return False
    return election.status in {"en_preparacion", "publicada", "en_votacion"}


def candidate_for_position(lista: ElectionList, position_id: int) -> ElectionCandidate | None:
    for candidate in lista.candidates:
        if candidate.position_id == position_id:
            return candidate
    return None


def validate_candidate_fields(
    election: Election,
    position: ElectionPosition,
    *,
    full_name: str,
    profession: str,
    short_profile: str,
    photo_url: str | None,
    skip_photo: bool = False,
) -> None:
    if position.full_name_required and not full_name.strip():
        raise ElectionValidationError(f"El cargo {position.name} exige nombre completo.")
    if position.profession_required and not profession.strip():
        raise ElectionValidationError(f"El cargo {position.name} exige profesión.")
    if position.short_profile_required and not short_profile.strip():
        raise ElectionValidationError(f"El cargo {position.name} exige un perfil breve.")
    needs_photo = election.photo_required or position.photo_required
    if not skip_photo and needs_photo and not photo_url:
        raise ElectionValidationError(f"El cargo {position.name} exige fotografía.")


def validate_list_activation(election: Election, lista: ElectionList) -> None:
    if election.work_plan_required and not lista.work_plan_url:
        raise ElectionValidationError("Esta lista debe adjuntar el plan de trabajo en PDF.")
    if election.list_color_required and not lista.color:
        raise ElectionValidationError("Esta lista debe tener un color distintivo.")
    if election.list_logo_enabled is False:
        pass
    if election.backing_document_required and not lista.backing_document_url:
        raise ElectionValidationError("Esta lista debe adjuntar el documento de respaldo.")
    if not lista.candidates:
        raise ElectionValidationError("La lista debe tener al menos un candidato.")
    if not lista.name.strip():
        raise ElectionValidationError("El nombre de la lista es obligatorio.")

    positions = {item.id: item for item in election.positions if item.is_active}
    for candidate in lista.candidates:
        position = positions.get(candidate.position_id)
        if position is None:
            raise ElectionValidationError("Hay un candidato con un cargo inactivo o inexistente.")
        validate_candidate_fields(
            election,
            position,
            full_name=candidate.full_name,
            profession=candidate.profession,
            short_profile=candidate.short_profile,
            photo_url=candidate.photo_url,
        )


def position_by_id(election: Election, position_id: int) -> ElectionPosition:
    for position in election.positions:
        if position.id == position_id:
            return position
    raise ElectionValidationError("El cargo no pertenece a este periodo.")


def calendar_event(election: Election, event_key: str) -> CalendarEvent | None:
    for event in election.calendar:
        if event.event_key == event_key:
            return event
    return None


def render_template(text: str, *, nombre: str, titulo: str, fecha_inicio: str, fecha_fin: str) -> str:
    return (
        (text or "")
        .replace("{nombre}", nombre)
        .replace("{titulo}", titulo)
        .replace("{fecha_inicio}", fecha_inicio)
        .replace("{fecha_fin}", fecha_fin)
    )
