from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response

from app.modules.auth.domain.entities import User
from app.modules.auth.presentation.api.dependencies import require_access
from app.modules.votaciones.application.use_cases import (
    CastVoteUseCase,
    CloseElectionUseCase,
    GetMemberPortalUseCase,
    GetOrCreateElectionUseCase,
    GetPublicCalendarUseCase,
    GetReportsUseCase,
    ManageListsUseCase,
    ManageVotersUseCase,
    SaveCalendarUseCase,
    SaveMessagesUseCase,
    SavePositionsUseCase,
    StartElectionUseCase,
    UpdateElectionUseCase,
    UploadElectionMediaUseCase,
)
from app.modules.votaciones.domain.exceptions import (
    ElectionConflictError,
    ElectionForbiddenError,
    ElectionNotFoundError,
    ElectionValidationError,
)
from app.modules.votaciones.presentation.api.dependencies import (
    get_calendar_use_case,
    get_close_election_use_case,
    get_lists_use_case,
    get_media_use_case,
    get_member_portal_use_case,
    get_messages_use_case,
    get_or_create_election_use_case,
    get_positions_use_case,
    get_public_calendar_use_case,
    get_reports_use_case,
    get_start_election_use_case,
    get_update_election_use_case,
    get_vote_use_case,
    get_voters_use_case,
)
from app.modules.votaciones.presentation.api.schemas import (
    CalendarWriteRequest,
    CandidateWriteRequest,
    ElectionResponse,
    ElectionWriteRequest,
    ListResponse,
    ListWriteRequest,
    MediaResponse,
    MemberPortalResponse,
    MessageActionRequest,
    MessageCountResponse,
    MessageDeliveryResponse,
    MessageTemplateResponse,
    MessagesWriteRequest,
    PositionResponse,
    PositionWriteRequest,
    PublicCalendarResponse,
    PublishRequest,
    ReorderRequest,
    ReportResponse,
    VoteRequest,
    VoterListResponse,
    VoterToggleRequest,
)

router = APIRouter(prefix="/api/votaciones", tags=["votaciones"])


def _http_error(exc: Exception) -> HTTPException:
    if isinstance(exc, ElectionNotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=exc.message)
    if isinstance(exc, ElectionValidationError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message)
    if isinstance(exc, ElectionConflictError):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.message)
    if isinstance(exc, ElectionForbiddenError):
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=exc.message)
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/admin/election", response_model=ElectionResponse)
def get_admin_election(
    _: Annotated[User, Depends(require_access("admin"))],
    use_case: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    election_id: int | None = None,
) -> ElectionResponse:
    try:
        election, periods, guide, readonly = use_case.execute(election_id)
    except Exception as exc:
        raise _http_error(exc) from exc
    return ElectionResponse.from_domain(election, is_readonly=readonly, guide=guide, periods=periods)


@router.put("/admin/election", response_model=ElectionResponse)
def update_admin_election(
    payload: ElectionWriteRequest,
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[UpdateElectionUseCase, Depends(get_update_election_use_case)],
    election_id: int | None = None,
) -> ElectionResponse:
    try:
        current, periods, guide, _readonly = loader.execute(election_id)
        election = use_case.execute(current.id, payload.model_dump(exclude_unset=True))
    except Exception as exc:
        raise _http_error(exc) from exc
    return ElectionResponse.from_domain(election, guide=guide, periods=periods)


@router.post("/admin/election/close", response_model=ElectionResponse)
def close_election(
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[CloseElectionUseCase, Depends(get_close_election_use_case)],
    election_id: int | None = None,
) -> ElectionResponse:
    try:
        current, periods, guide, _readonly = loader.execute(election_id)
        election = use_case.execute(current.id)
    except Exception as exc:
        raise _http_error(exc) from exc
    return ElectionResponse.from_domain(election, is_readonly=True, guide=guide, periods=periods)


@router.post("/admin/election/start", response_model=ElectionResponse, status_code=201)
def start_election(
    _: Annotated[User, Depends(require_access("admin"))],
    use_case: Annotated[StartElectionUseCase, Depends(get_start_election_use_case)],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
) -> ElectionResponse:
    try:
        created = use_case.execute()
        election, periods, guide, readonly = loader.execute(created.id)
    except Exception as exc:
        raise _http_error(exc) from exc
    return ElectionResponse.from_domain(election, is_readonly=readonly, guide=guide, periods=periods)


@router.post("/admin/election/media", response_model=MediaResponse)
async def upload_election_media(
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[UploadElectionMediaUseCase, Depends(get_media_use_case)],
    kind: str = Query(...),
    election_id: int | None = None,
    file: UploadFile = File(...),
) -> MediaResponse:
    try:
        current, *_rest = loader.execute(election_id)
        url = use_case.election_media(
            current.id,
            kind,
            file.filename or "archivo",
            await file.read(),
            file.content_type or "",
        )
    except Exception as exc:
        raise _http_error(exc) from exc
    return MediaResponse(url=url)


@router.post("/admin/positions", response_model=PositionResponse)
def create_position(
    payload: PositionWriteRequest,
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[SavePositionsUseCase, Depends(get_positions_use_case)],
    election_id: int | None = None,
) -> PositionResponse:
    try:
        current, *_rest = loader.execute(election_id)
        position = use_case.create(current.id, payload.name or "")
    except Exception as exc:
        raise _http_error(exc) from exc
    return PositionResponse.from_domain(position)


@router.put("/admin/positions/reorder", response_model=ElectionResponse)
def reorder_positions(
    payload: ReorderRequest,
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[SavePositionsUseCase, Depends(get_positions_use_case)],
    election_id: int | None = None,
) -> ElectionResponse:
    try:
        current, periods, guide, readonly = loader.execute(election_id)
        election = use_case.reorder(current.id, payload.ids)
    except Exception as exc:
        raise _http_error(exc) from exc
    return ElectionResponse.from_domain(election, is_readonly=readonly, guide=guide, periods=periods)


@router.put("/admin/positions/{position_id}", response_model=PositionResponse)
def update_position(
    position_id: int,
    payload: PositionWriteRequest,
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[SavePositionsUseCase, Depends(get_positions_use_case)],
    election_id: int | None = None,
) -> PositionResponse:
    try:
        current, *_rest = loader.execute(election_id)
        position = use_case.update(current.id, position_id, payload.model_dump(exclude_unset=True))
    except Exception as exc:
        raise _http_error(exc) from exc
    return PositionResponse.from_domain(position)


@router.delete("/admin/positions/{position_id}", status_code=204)
def delete_position(
    position_id: int,
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[SavePositionsUseCase, Depends(get_positions_use_case)],
    election_id: int | None = None,
) -> None:
    try:
        current, *_rest = loader.execute(election_id)
        use_case.delete(current.id, position_id)
    except Exception as exc:
        raise _http_error(exc) from exc


@router.put("/admin/calendar", response_model=ElectionResponse)
def save_calendar(
    payload: CalendarWriteRequest,
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[SaveCalendarUseCase, Depends(get_calendar_use_case)],
    election_id: int | None = None,
) -> ElectionResponse:
    try:
        current, periods, guide, readonly = loader.execute(election_id)
        use_case.save(current.id, [item.model_dump() for item in payload.events])
        election, periods, guide, readonly = loader.execute(current.id)
    except Exception as exc:
        raise _http_error(exc) from exc
    return ElectionResponse.from_domain(election, is_readonly=readonly, guide=guide, periods=periods)


@router.post("/admin/calendar/publish", response_model=ElectionResponse)
def publish_calendar(
    payload: PublishRequest,
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[SaveCalendarUseCase, Depends(get_calendar_use_case)],
    election_id: int | None = None,
) -> ElectionResponse:
    try:
        current, periods, guide, readonly = loader.execute(election_id)
        election = use_case.publish(current.id, payload.public)
    except Exception as exc:
        raise _http_error(exc) from exc
    return ElectionResponse.from_domain(election, is_readonly=readonly, guide=guide, periods=periods)


@router.get("/admin/calendar/download")
def download_calendar(
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[GetReportsUseCase, Depends(get_reports_use_case)],
    election_id: int | None = None,
) -> Response:
    try:
        current, *_rest = loader.execute(election_id)
        content = use_case.calendar_pdf(current.id)
    except Exception as exc:
        raise _http_error(exc) from exc
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="cronograma-electoral.pdf"'},
    )


@router.get("/admin/lists", response_model=list[ListResponse])
def list_lists(
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[ManageListsUseCase, Depends(get_lists_use_case)],
    election_id: int | None = None,
) -> list[ListResponse]:
    try:
        current, *_rest = loader.execute(election_id)
        items = use_case.list_items(current.id)
    except Exception as exc:
        raise _http_error(exc) from exc
    return [ListResponse.from_domain(item) for item in items]


@router.post("/admin/lists", response_model=ListResponse)
def create_list(
    payload: ListWriteRequest,
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[ManageListsUseCase, Depends(get_lists_use_case)],
    election_id: int | None = None,
) -> ListResponse:
    try:
        current, *_rest = loader.execute(election_id)
        item = use_case.create(current.id, payload.model_dump(exclude_unset=True))
    except Exception as exc:
        raise _http_error(exc) from exc
    return ListResponse.from_domain(item)


@router.get("/admin/lists/{list_id}", response_model=ListResponse)
def get_list(
    list_id: int,
    _: Annotated[User, Depends(require_access("admin"))],
    use_case: Annotated[ManageListsUseCase, Depends(get_lists_use_case)],
) -> ListResponse:
    try:
        item = use_case.get(list_id)
    except Exception as exc:
        raise _http_error(exc) from exc
    return ListResponse.from_domain(item)


@router.put("/admin/lists/{list_id}", response_model=ListResponse)
def update_list(
    list_id: int,
    payload: ListWriteRequest,
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[ManageListsUseCase, Depends(get_lists_use_case)],
    election_id: int | None = None,
) -> ListResponse:
    try:
        current, *_rest = loader.execute(election_id)
        item = use_case.update(current.id, list_id, payload.model_dump(exclude_unset=True))
    except Exception as exc:
        raise _http_error(exc) from exc
    return ListResponse.from_domain(item)


@router.delete("/admin/lists/{list_id}", status_code=204)
def delete_list(
    list_id: int,
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[ManageListsUseCase, Depends(get_lists_use_case)],
    election_id: int | None = None,
) -> None:
    try:
        current, *_rest = loader.execute(election_id)
        use_case.delete(current.id, list_id)
    except Exception as exc:
        raise _http_error(exc) from exc


@router.post("/admin/lists/{list_id}/logo", response_model=MediaResponse)
async def upload_list_logo(
    list_id: int,
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[UploadElectionMediaUseCase, Depends(get_media_use_case)],
    election_id: int | None = None,
    file: UploadFile = File(...),
) -> MediaResponse:
    return await _upload_list_file(list_id, "logo", file, loader, use_case, election_id)


@router.post("/admin/lists/{list_id}/work-plan", response_model=MediaResponse)
async def upload_work_plan(
    list_id: int,
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[UploadElectionMediaUseCase, Depends(get_media_use_case)],
    election_id: int | None = None,
    file: UploadFile = File(...),
) -> MediaResponse:
    return await _upload_list_file(list_id, "work-plan", file, loader, use_case, election_id)


@router.post("/admin/lists/{list_id}/backing-document", response_model=MediaResponse)
async def upload_backing(
    list_id: int,
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[UploadElectionMediaUseCase, Depends(get_media_use_case)],
    election_id: int | None = None,
    file: UploadFile = File(...),
) -> MediaResponse:
    return await _upload_list_file(list_id, "backing", file, loader, use_case, election_id)


@router.post("/admin/lists/{list_id}/candidates", response_model=ListResponse)
def create_candidate(
    list_id: int,
    payload: CandidateWriteRequest,
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[ManageListsUseCase, Depends(get_lists_use_case)],
    election_id: int | None = None,
) -> ListResponse:
    try:
        current, *_rest = loader.execute(election_id)
        use_case.save_candidate(current.id, list_id, payload.model_dump())
        item = use_case.get(list_id)
    except Exception as exc:
        raise _http_error(exc) from exc
    return ListResponse.from_domain(item)


@router.put("/admin/lists/{list_id}/candidates/{candidate_id}", response_model=ListResponse)
def update_candidate(
    list_id: int,
    candidate_id: int,
    payload: CandidateWriteRequest,
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[ManageListsUseCase, Depends(get_lists_use_case)],
    election_id: int | None = None,
) -> ListResponse:
    try:
        current, *_rest = loader.execute(election_id)
        use_case.save_candidate(current.id, list_id, payload.model_dump(), candidate_id)
        item = use_case.get(list_id)
    except Exception as exc:
        raise _http_error(exc) from exc
    return ListResponse.from_domain(item)


@router.delete("/admin/lists/{list_id}/candidates/{candidate_id}", status_code=204)
def delete_candidate(
    list_id: int,
    candidate_id: int,
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[ManageListsUseCase, Depends(get_lists_use_case)],
    election_id: int | None = None,
) -> None:
    try:
        current, *_rest = loader.execute(election_id)
        use_case.delete_candidate(current.id, list_id, candidate_id)
    except Exception as exc:
        raise _http_error(exc) from exc


@router.post("/admin/lists/{list_id}/candidates/{candidate_id}/photo", response_model=MediaResponse)
async def upload_candidate_photo(
    list_id: int,
    candidate_id: int,
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[UploadElectionMediaUseCase, Depends(get_media_use_case)],
    election_id: int | None = None,
    file: UploadFile = File(...),
) -> MediaResponse:
    try:
        current, *_rest = loader.execute(election_id)
        url = use_case.candidate_photo(
            current.id,
            list_id,
            candidate_id,
            file.filename or "foto.jpg",
            await file.read(),
            file.content_type or "",
        )
    except Exception as exc:
        raise _http_error(exc) from exc
    return MediaResponse(url=url)


@router.get("/admin/voters", response_model=VoterListResponse)
def list_voters(
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[ManageVotersUseCase, Depends(get_voters_use_case)],
    election_id: int | None = None,
    q: str = "",
    payment_status: str | None = None,
    enabled: bool | None = None,
    type_profile: str | None = None,
    location: str | None = None,
    page: int = 1,
    page_size: int = 8,
) -> VoterListResponse:
    try:
        current, *_rest = loader.execute(election_id)
        result = use_case.list_items(
            current.id,
            q=q,
            payment_status=payment_status,
            enabled=enabled,
            page=page,
            page_size=page_size,
            type_profile=type_profile,
            location=location,
        )
    except Exception as exc:
        raise _http_error(exc) from exc
    return VoterListResponse.from_domain(result)


@router.put("/admin/voters/{user_id}", response_model=VoterListResponse)
def toggle_voter(
    user_id: int,
    payload: VoterToggleRequest,
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[ManageVotersUseCase, Depends(get_voters_use_case)],
    election_id: int | None = None,
) -> VoterListResponse:
    try:
        current, *_rest = loader.execute(election_id)
        use_case.toggle(current.id, user_id, payload.voting_enabled)
        result = use_case.list_items(current.id)
    except Exception as exc:
        raise _http_error(exc) from exc
    return VoterListResponse.from_domain(result)


@router.post("/admin/voters/sync", response_model=VoterListResponse)
def sync_voters(
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[ManageVotersUseCase, Depends(get_voters_use_case)],
    election_id: int | None = None,
) -> VoterListResponse:
    try:
        current, *_rest = loader.execute(election_id)
        result = use_case.sync(current.id)
    except Exception as exc:
        raise _http_error(exc) from exc
    return VoterListResponse.from_domain(result)


@router.get("/admin/voters/export")
def export_voters(
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[ManageVotersUseCase, Depends(get_voters_use_case)],
    election_id: int | None = None,
) -> Response:
    try:
        current, *_rest = loader.execute(election_id)
        rows = use_case.export_rows(current.id)
    except Exception as exc:
        raise _http_error(exc) from exc
    lines = ["nombre,apellido,identificador,codigo,profesion,correo,pago,habilitado,voto"]
    for item in rows:
        lines.append(
            ",".join(
                [
                    item.names,
                    item.lastname,
                    item.identifier,
                    item.member_code,
                    item.profession,
                    item.email,
                    item.payment_status,
                    "si" if item.voting_enabled else "no",
                    "si" if item.has_voted else "no",
                ]
            )
        )
    return Response(
        content="\n".join(lines),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="padron-electoral.csv"'},
    )


@router.put("/admin/messages", response_model=ElectionResponse)
def save_messages(
    payload: MessagesWriteRequest,
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[SaveMessagesUseCase, Depends(get_messages_use_case)],
    election_id: int | None = None,
) -> ElectionResponse:
    try:
        current, periods, guide, readonly = loader.execute(election_id)
        use_case.save(current.id, [item.model_dump() for item in payload.templates])
        election, periods, guide, readonly = loader.execute(current.id)
    except Exception as exc:
        raise _http_error(exc) from exc
    return ElectionResponse.from_domain(election, is_readonly=readonly, guide=guide, periods=periods)


@router.post("/admin/messages/test", response_model=MessageCountResponse)
def test_message(
    payload: MessageActionRequest,
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[SaveMessagesUseCase, Depends(get_messages_use_case)],
    election_id: int | None = None,
) -> MessageCountResponse:
    if not payload.email:
        raise HTTPException(status_code=400, detail="Indica un correo de prueba.")
    try:
        current, *_rest = loader.execute(election_id)
        use_case.test(current.id, payload.template_key, payload.email)
    except Exception as exc:
        raise _http_error(exc) from exc
    return MessageCountResponse(sent=1)


@router.post("/admin/messages/send", response_model=MessageCountResponse)
def send_message(
    payload: MessageActionRequest,
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[SaveMessagesUseCase, Depends(get_messages_use_case)],
    election_id: int | None = None,
) -> MessageCountResponse:
    try:
        current, *_rest = loader.execute(election_id)
        sent = use_case.send(current.id, payload.template_key, only_unsent=payload.only_unsent)
    except Exception as exc:
        raise _http_error(exc) from exc
    return MessageCountResponse(sent=sent)


@router.get("/admin/messages/status", response_model=list[MessageDeliveryResponse])
def message_status(
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[SaveMessagesUseCase, Depends(get_messages_use_case)],
    election_id: int | None = None,
) -> list[MessageDeliveryResponse]:
    try:
        current, *_rest = loader.execute(election_id)
        return [MessageDeliveryResponse.from_domain(item) for item in use_case.status(current.id)]
    except Exception as exc:
        raise _http_error(exc) from exc


@router.post("/admin/messages/schedule", response_model=MessageTemplateResponse)
def schedule_message(
    payload: MessageActionRequest,
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[SaveMessagesUseCase, Depends(get_messages_use_case)],
    election_id: int | None = None,
) -> MessageTemplateResponse:
    try:
        current, *_rest = loader.execute(election_id)
        scheduled = payload.scheduled_at.isoformat() if payload.scheduled_at else None
        template = use_case.schedule(current.id, payload.template_key, scheduled)
    except Exception as exc:
        raise _http_error(exc) from exc
    return MessageTemplateResponse.from_domain(template)


@router.post("/admin/messages/resend", response_model=MessageCountResponse)
def resend_message(
    payload: MessageActionRequest,
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[SaveMessagesUseCase, Depends(get_messages_use_case)],
    election_id: int | None = None,
) -> MessageCountResponse:
    try:
        current, *_rest = loader.execute(election_id)
        sent = use_case.send(current.id, payload.template_key, only_unsent=True)
    except Exception as exc:
        raise _http_error(exc) from exc
    return MessageCountResponse(sent=sent)


@router.get("/admin/reports", response_model=ReportResponse)
def get_reports(
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[GetReportsUseCase, Depends(get_reports_use_case)],
    election_id: int | None = None,
) -> ReportResponse:
    try:
        current, *_rest = loader.execute(election_id)
        report = use_case.snapshot(current.id)
    except Exception as exc:
        raise _http_error(exc) from exc
    return ReportResponse.from_domain(report)


@router.get("/admin/reports/export")
def export_reports(
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[GetReportsUseCase, Depends(get_reports_use_case)],
    election_id: int | None = None,
    format: str = "pdf",
) -> Response:
    try:
        current, *_rest = loader.execute(election_id)
        report = use_case.snapshot(current.id)
        if format == "xlsx":
            lines = ["lista,candidato,votos,porcentaje,estado"]
            for row in report.rows:
                lines.append(f"{row.name},{row.principal_name},{row.votes},{row.percentage},{row.result_status}")
            return Response(
                content="\n".join(lines),
                media_type="text/csv",
                headers={"Content-Disposition": f'attachment; filename="reporte-periodo-{report.election_id}.csv"'},
            )
        content = use_case.export_pdf(current.id)
    except Exception as exc:
        raise _http_error(exc) from exc
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="reporte-periodo-{current.id}.pdf"'},
    )


@router.get("/admin/reports/acta")
def download_acta(
    _: Annotated[User, Depends(require_access("admin"))],
    loader: Annotated[GetOrCreateElectionUseCase, Depends(get_or_create_election_use_case)],
    use_case: Annotated[GetReportsUseCase, Depends(get_reports_use_case)],
    election_id: int | None = None,
) -> Response:
    try:
        current, *_rest = loader.execute(election_id)
        content = use_case.acta(current.id)
    except Exception as exc:
        raise _http_error(exc) from exc
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="acta-periodo-{current.id}.pdf"'},
    )


@router.get("/me", response_model=MemberPortalResponse)
def get_member_portal(
    user: Annotated[User, Depends(require_access("member"))],
    use_case: Annotated[GetMemberPortalUseCase, Depends(get_member_portal_use_case)],
) -> MemberPortalResponse:
    try:
        portal = use_case.execute(user.id)
    except Exception as exc:
        raise _http_error(exc) from exc
    return MemberPortalResponse.from_domain(portal)


@router.get("/me/lists/{list_id}", response_model=MemberPortalResponse)
def get_member_list(
    list_id: int,
    user: Annotated[User, Depends(require_access("member"))],
    use_case: Annotated[GetMemberPortalUseCase, Depends(get_member_portal_use_case)],
) -> MemberPortalResponse:
    try:
        portal = use_case.execute(user.id, list_id)
    except Exception as exc:
        raise _http_error(exc) from exc
    return MemberPortalResponse.from_domain(portal)


@router.post("/me/vote", status_code=204)
def cast_vote(
    payload: VoteRequest,
    user: Annotated[User, Depends(require_access("member"))],
    use_case: Annotated[CastVoteUseCase, Depends(get_vote_use_case)],
) -> None:
    try:
        use_case.execute(user.id, payload.model_dump())
    except Exception as exc:
        raise _http_error(exc) from exc


@router.get("/public/calendar", response_model=PublicCalendarResponse)
def public_calendar(
    use_case: Annotated[GetPublicCalendarUseCase, Depends(get_public_calendar_use_case)],
) -> PublicCalendarResponse:
    election = use_case.get()
    if election is None:
        return PublicCalendarResponse(public=False)
    return PublicCalendarResponse(public=True, election=ElectionResponse.from_domain(election))


@router.get("/public/calendar/download")
def public_calendar_download(
    use_case: Annotated[GetPublicCalendarUseCase, Depends(get_public_calendar_use_case)],
) -> Response:
    try:
        content = use_case.download()
    except Exception as exc:
        raise _http_error(exc) from exc
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="cronograma-electoral.pdf"'},
    )


async def _upload_list_file(
    list_id: int,
    kind: str,
    file: UploadFile,
    loader: GetOrCreateElectionUseCase,
    use_case: UploadElectionMediaUseCase,
    election_id: int | None,
) -> MediaResponse:
    try:
        current, *_rest = loader.execute(election_id)
        url = use_case.list_media(
            current.id,
            list_id,
            kind,
            file.filename or "archivo",
            await file.read(),
            file.content_type or "",
        )
    except Exception as exc:
        raise _http_error(exc) from exc
    return MediaResponse(url=url)
