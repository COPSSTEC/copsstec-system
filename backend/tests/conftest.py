import pytest


@pytest.fixture(autouse=True)
def _local_storage_only(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("FIREBASE_STORAGE_BUCKET", raising=False)
