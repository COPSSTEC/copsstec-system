from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db_session
from app.modules.partners.infrastructure.repository import PartnerRepository
from app.modules.partners.presentation.api.schemas import PartnerResponse

router = APIRouter(prefix="/api/partners", tags=["partners"])


@router.get("", response_model=list[PartnerResponse])
def list_partners(
    session: Annotated[Session, Depends(get_db_session)],
) -> list[PartnerResponse]:
    partners = PartnerRepository(session).list_active()
    return [PartnerResponse.from_domain(partner) for partner in partners]
