from pathlib import Path

from scripts.import_ciiu_catalog import load_catalog


def test_importer_filters_inactive_rows_normalizes_risk_and_preserves_description(
    tmp_path: Path,
) -> None:
    source = tmp_path / "ciiu.csv"
    source.write_text(
        "codigo,descripcion,nivel_riesgo,estado\n"
        'A1,"Descripción, con tildes (y puntuación) completa.",Riesgo Bajo,activo\n'
        'A2,"Actividad sin clasificación",,activo\n'
        'A3,"No debe salir",Riesgo Alto,inactivo\n',
        encoding="utf-8",
    )

    assert load_catalog(source) == [
        {
            "code": "A1",
            "description": "Descripción, con tildes (y puntuación) completa.",
            "risk": "Bajo",
        },
        {
            "code": "A2",
            "description": "Actividad sin clasificación",
            "risk": "no_definido",
        },
    ]


def test_importer_rejects_duplicate_active_codes(tmp_path: Path) -> None:
    source = tmp_path / "ciiu.csv"
    source.write_text(
        "codigo,descripcion,nivel_riesgo,estado\n"
        "A1,Primera,Riesgo Bajo,activo\n"
        "A1,Duplicada,Riesgo Medio,activo\n",
        encoding="utf-8",
    )

    try:
        load_catalog(source)
    except ValueError as exc:
        assert "Duplicate active CIIU code" in str(exc)
    else:
        raise AssertionError("Expected duplicate active code validation to fail")
