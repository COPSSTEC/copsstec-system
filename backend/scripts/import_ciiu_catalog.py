#!/usr/bin/env python3
"""Validate and materialize the versioned CIIU catalog used by Cotiza SST."""

import argparse
import csv
import json
from pathlib import Path

RISK_MAP = {
    "Riesgo Bajo": "Bajo",
    "Riesgo Medio": "Medio",
    "Riesgo Alto": "Alto",
}
UNDEFINED_RISK = "no_definido"
REQUIRED_COLUMNS = {"codigo", "descripcion", "nivel_riesgo", "estado"}


def load_catalog(source: Path) -> list[dict[str, str]]:
    with source.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None or not REQUIRED_COLUMNS.issubset(reader.fieldnames):
            raise ValueError(f"Missing required CSV columns: {sorted(REQUIRED_COLUMNS)}")

        records: list[dict[str, str]] = []
        codes: set[str] = set()
        for row_number, row in enumerate(reader, start=2):
            if row.get("estado", "").strip().lower() != "activo":
                continue

            code = row.get("codigo", "").strip()
            description = row.get("descripcion")
            if not code or description is None:
                raise ValueError(f"Invalid active CIIU row {row_number}.")
            if code in codes:
                raise ValueError(f"Duplicate active CIIU code at row {row_number}: {code}")

            source_risk = row.get("nivel_riesgo", "").strip()
            risk = RISK_MAP.get(source_risk, UNDEFINED_RISK if not source_risk else None)
            if risk is None:
                raise ValueError(f"Unsupported risk at row {row_number}: {source_risk}")

            codes.add(code)
            records.append({"code": code, "description": description, "risk": risk})

    return records


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path, help="Source c_i_u_u_s_rows.csv")
    parser.add_argument("output", type=Path, help="Versioned JSON output path")
    args = parser.parse_args()

    records = load_catalog(args.source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(records, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(records)} active CIIU records to {args.output}")


if __name__ == "__main__":
    main()
