import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.modules.auth.application.rbac import resolve_access_level
from app.modules.auth.domain.entities import User
from app.modules.auth.presentation.api.dependencies import get_current_user
from app.modules.sst_calculator.application.use_cases import (
    GetAuthorizedCiiuCatalogUseCase,
    GetSstCalculatorAccessUseCase,
)
from app.modules.sst_calculator.domain.entities import SstCalculatorUser
from app.modules.sst_calculator.domain.exceptions import (
    CiiuCatalogUnavailableError,
    SstCalculatorAccessDeniedError,
    SstCalculatorEvaluationError,
)
from app.modules.sst_calculator.presentation.api.dependencies import (
    get_authorized_ciiu_catalog_use_case,
    get_sst_access_use_case,
)
from app.modules.sst_calculator.presentation.api.schemas import (
    CiiuActivityResponse,
    SstCalculatorAccessResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/sst-calculator", tags=["sst-calculator"])

ACCESS_DENIED_DETAIL = "No tienes acceso a Cotiza SST. Verifica tu estado de membresía y pagos."
EVALUATION_ERROR_DETAIL = "No fue posible validar el acceso a Cotiza SST."
CATALOG_ERROR_DETAIL = "No fue posible cargar el catálogo CIIU."


def _sst_user(user: User) -> SstCalculatorUser:
    return SstCalculatorUser(
        user_id=user.id,
        roles=tuple(user.roles),
        access_level=resolve_access_level(user.roles),
        state_id=user.state_id,
    )


@router.get("/access", response_model=SstCalculatorAccessResponse)
def get_access(
    user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[GetSstCalculatorAccessUseCase, Depends(get_sst_access_use_case)],
) -> SstCalculatorAccessResponse:
    try:
        return SstCalculatorAccessResponse.from_domain(use_case.execute(_sst_user(user)))
    except SstCalculatorEvaluationError as exc:
        logger.exception("Could not evaluate SST calculator access for user %s", user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=EVALUATION_ERROR_DETAIL,
        ) from exc


@router.get("/catalog", response_model=list[CiiuActivityResponse])
def get_catalog(
    user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[
        GetAuthorizedCiiuCatalogUseCase,
        Depends(get_authorized_ciiu_catalog_use_case),
    ],
) -> list[CiiuActivityResponse]:
    try:
        return [CiiuActivityResponse.from_domain(item) for item in use_case.execute(_sst_user(user))]
    except SstCalculatorAccessDeniedError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ACCESS_DENIED_DETAIL,
        ) from exc
    except SstCalculatorEvaluationError as exc:
        logger.exception("Could not evaluate SST catalog access for user %s", user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=EVALUATION_ERROR_DETAIL,
        ) from exc
    except CiiuCatalogUnavailableError as exc:
        logger.exception("Could not load the bundled CIIU catalog")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=CATALOG_ERROR_DETAIL,
        ) from exc
