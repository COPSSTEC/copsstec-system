import json
from functools import cached_property
from pathlib import Path
from typing import cast

from app.modules.sst_calculator.domain.entities import CiiuActivity, RiskLevel
from app.modules.sst_calculator.domain.exceptions import CiiuCatalogUnavailableError

VALID_RISKS = {"Bajo", "Medio", "Alto"}


class JsonCiiuCatalogAdapter:
    def __init__(self, catalog_path: Path | None = None) -> None:
        self.catalog_path = catalog_path or Path(__file__).with_name("data") / "ciiu.json"

    def list_activities(self) -> tuple[CiiuActivity, ...]:
        return self._activities

    @cached_property
    def _activities(self) -> tuple[CiiuActivity, ...]:
        try:
            payload = json.loads(self.catalog_path.read_text(encoding="utf-8"))
            if not isinstance(payload, list):
                raise ValueError("The catalog root must be a list.")

            activities: list[CiiuActivity] = []
            for item in payload:
                if not isinstance(item, dict) or set(item) != {"code", "description", "risk"}:
                    raise ValueError("Invalid catalog item shape.")
                code = item["code"]
                description = item["description"]
                risk = item["risk"]
                if not isinstance(code, str) or not code.strip():
                    raise ValueError("Invalid CIIU code.")
                if not isinstance(description, str) or risk not in VALID_RISKS:
                    raise ValueError("Invalid CIIU activity values.")
                activities.append(
                    CiiuActivity(
                        code=code,
                        description=description,
                        risk=cast(RiskLevel, risk),
                    ),
                )
            if len(activities) != 1738:
                raise ValueError("Unexpected CIIU catalog size.")
            return tuple(activities)
        except (OSError, ValueError, TypeError, json.JSONDecodeError) as exc:
            raise CiiuCatalogUnavailableError() from exc
