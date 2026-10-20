from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from app.modules.payments.presentation.api.dependencies import get_membership_balance_use_case
from app.modules.payments.public import GetMembershipBalanceUseCase
from app.modules.sst_calculator.application.use_cases import (
    GetAuthorizedCiiuCatalogUseCase,
    GetSstCalculatorAccessUseCase,
)
from app.modules.sst_calculator.infrastructure.ciiu_catalog import JsonCiiuCatalogAdapter
from app.modules.sst_calculator.infrastructure.payments_balance import PaymentsMembershipBalanceAdapter


@lru_cache(maxsize=1)
def get_ciiu_catalog_reader() -> JsonCiiuCatalogAdapter:
    return JsonCiiuCatalogAdapter()


def get_sst_access_use_case(
    payments_use_case: Annotated[
        GetMembershipBalanceUseCase,
        Depends(get_membership_balance_use_case),
    ],
) -> GetSstCalculatorAccessUseCase:
    return GetSstCalculatorAccessUseCase(PaymentsMembershipBalanceAdapter(payments_use_case))


def get_authorized_ciiu_catalog_use_case(
    access_use_case: Annotated[GetSstCalculatorAccessUseCase, Depends(get_sst_access_use_case)],
    catalog_reader: Annotated[JsonCiiuCatalogAdapter, Depends(get_ciiu_catalog_reader)],
) -> GetAuthorizedCiiuCatalogUseCase:
    return GetAuthorizedCiiuCatalogUseCase(access_use_case, catalog_reader)
