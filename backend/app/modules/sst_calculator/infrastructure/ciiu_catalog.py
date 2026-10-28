import json
from functools import cached_property
from pathlib import Path
from typing import cast

from app.modules.sst_calculator.domain.entities import (
    CatalogRisk,
    CiiuActivity,
    CiiuCatalogRecord,
    RiskLevel,
)
from app.modules.sst_calculator.domain.exceptions import CiiuCatalogUnavailableError

VALID_RISKS = {"Bajo", "Medio", "Alto"}
UNDEFINED_RISK = "no_definido"
CATALOG_RISKS = VALID_RISKS | {UNDEFINED_RISK}
EXPECTED_RECORD_COUNT = 6360
EXPECTED_UNDEFINED_RISK_COUNT = 756


class JsonCiiuCatalogAdapter:
    def __init__(self, catalog_path: Path | None = None) -> None:
        self.catalog_path = catalog_path or Path(__file__).with_name("data") / "ciiu.json"

    def list_activities(self) -> tuple[CiiuActivity, ...]:
        return tuple(
            CiiuActivity(
                code=record.code,
                description=record.description,
                risk=cast(RiskLevel, record.risk),
            )
            for record in self.list_records()
            if record.risk in VALID_RISKS
        )

    def list_records(self) -> tuple[CiiuCatalogRecord, ...]:
        """Return every active source row, including records without risk."""

        return self._records

    @cached_property
    def _records(self) -> tuple[CiiuCatalogRecord, ...]:
        try:
            payload = json.loads(self.catalog_path.read_text(encoding="utf-8"))
            if not isinstance(payload, list):
                raise ValueError("The catalog root must be a list.")

            records: list[CiiuCatalogRecord] = []
            codes: set[str] = set()
            for item in payload:
                if not isinstance(item, dict) or set(item) != {"code", "description", "risk"}:
                    raise ValueError("Invalid catalog item shape.")
                code = item["code"]
                description = item["description"]
                risk = item["risk"]
                if not isinstance(code, str) or not code.strip() or code in codes:
                    raise ValueError("Invalid CIIU code.")
                if not isinstance(description, str) or risk not in CATALOG_RISKS:
                    raise ValueError("Invalid CIIU activity values.")
                codes.add(code)
                records.append(
                    CiiuCatalogRecord(
                        code=code,
                        description=description,
                        risk=cast(CatalogRisk, risk),
                    )
                )
            if len(records) != EXPECTED_RECORD_COUNT:
                raise ValueError("Unexpected CIIU catalog size.")
            if sum(record.risk == UNDEFINED_RISK for record in records) != EXPECTED_UNDEFINED_RISK_COUNT:
                raise ValueError("Unexpected number of undefined CIIU risks.")
            return tuple(records)
        except (OSError, ValueError, TypeError, json.JSONDecodeError) as exc:
            raise CiiuCatalogUnavailableError() from exc
