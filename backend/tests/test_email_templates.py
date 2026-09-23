from app.shared.infrastructure.email.sender import MailtrapEmailSender
from app.shared.infrastructure.email.templates import RENDERERS, render_email, reset_url_for


def test_email_templates_include_logo_and_copy() -> None:
    contexts = {
        "access_credentials": {
            "nombres": "Ana Pérez",
            "email": "ana.perez@copsstec.com",
            "password": "tmp-123",
        },
        "corporate_mailbox": {
            "nombres": "Ana Pérez",
            "email": "ana.perez@copsstec.com",
            "password": "tmp-123",
        },
        "password_reset": {
            "nombres": "Ana Pérez",
            "token": "abc123",
            "reset_url": "http://localhost:3000/reset-password?email=ana@copsstec.com&token=abc123",
        },
        "new_member_admin": {"nombres": "Ana Pérez", "email": "ana@example.com"},
        "course_inscription_received": {
            "nombres": "Ana Pérez",
            "course_title": "Prevención de riesgos",
            "capacitator": "Ing. López",
            "modality": "Online",
            "date_course": "21/09/2026",
            "hour_init": "10:00",
            "hour_final": "12:00",
        },
        "course_inscription_confirmed": {
            "nombres": "Ana Pérez",
            "course_title": "Prevención de riesgos",
            "capacitator": "Ing. López",
            "modality": "Online",
            "date_course": "21/09/2026",
            "hour_init": "10:00",
            "hour_final": "12:00",
        },
        "course_payment_rejected": {
            "nombres": "Ana Pérez",
            "course_title": "Prevención de riesgos",
            "observation": "El comprobante no es legible",
        },
        "course_certificate": {"nombres": "Ana Pérez", "course_title": "Prevención de riesgos"},
        "course_feedback": {
            "nombres": "Ana Pérez",
            "course_title": "Prevención de riesgos",
            "url": "http://localhost:3000/cursos/feedback/tok",
        },
        "branded_content": {
            "nombres": "María López",
            "subject": "Convocatoria electoral",
            "content": "<p>El periodo de votación ya está abierto.</p>",
        },
        "payment_reminder": {
            "nombres": "Ana Pérez",
            "valor_pendiente": "50.00",
            "url_pago": "http://localhost:3000/afiliacion/pago",
        },
        "debit_agreement": {
            "nombres": "Ana Pérez",
            "pending_balance": "240.00",
            "url": "http://localhost:3000/acuerdo-debito/tok",
        },
    }

    for key in RENDERERS:
        subject, text, html = render_email(key, contexts[key])
        assert subject
        assert text
        assert "copsstec.com/assets/logos/coppstec.png" in html
        assert "COPSSTEC WEB" in html
        assert "Quito, Ecuador" in html
        assert "copsstec-email-root" in html


def test_reset_url_contains_email_and_token() -> None:
    url = reset_url_for("ana.perez@copsstec.com", "tok-99")
    assert "reset-password" in url
    assert "ana.perez" in url
    assert "tok-99" in url


def test_email_sender_logs_when_smtp_missing(monkeypatch, capsys) -> None:
    class EmptySmtp:
        smtp_host = ""
        smtp_port = 587
        smtp_user = ""
        smtp_password = ""
        smtp_from = "no-reply@copsstec.com"
        smtp_use_tls = True

    monkeypatch.setattr("app.shared.infrastructure.email.sender.get_settings", lambda: EmptySmtp())
    MailtrapEmailSender().send_template(
        "ana@example.com",
        "access_credentials",
        {"nombres": "Ana", "email": "ana@example.com", "password": "x"},
    )
    captured = capsys.readouterr()
    assert "EMAIL_LOG" in captured.out
    assert "ana@example.com" in captured.out


def test_forgot_password_sends_reset_template() -> None:
    from types import SimpleNamespace

    from app.modules.auth.application.use_cases import ForgotPasswordUseCase

    class Repo:
        def __init__(self) -> None:
            self.saved = None

        def get_user_by_email(self, email: str):
            return SimpleNamespace(email=email, name="Ana Pérez")

        def upsert_password_reset_token(self, email: str, token_hash: str) -> None:
            self.saved = (email, token_hash)

    class Sender:
        def __init__(self) -> None:
            self.sent = []

        def send(self, to_email: str, subject: str, body: str) -> None:
            self.sent.append((to_email, subject, body))

        def send_template(self, to_email: str, template_key: str, context=None) -> None:
            self.sent.append((to_email, template_key, context))

    repo = Repo()
    sender = Sender()
    token = ForgotPasswordUseCase(repo, sender).execute("ana@copsstec.com")

    assert token
    assert repo.saved is not None
    assert sender.sent[0][0] == "ana@copsstec.com"
    assert sender.sent[0][1] == "password_reset"
    assert token in sender.sent[0][2]["token"]


def test_forgot_password_missing_user_does_not_send() -> None:
    from app.modules.auth.application.use_cases import ForgotPasswordUseCase

    class Repo:
        def get_user_by_email(self, email: str):
            return None

    class Sender:
        sent = []

        def send_template(self, *args, **kwargs) -> None:
            self.sent.append(args)

    sender = Sender()
    token = ForgotPasswordUseCase(Repo(), sender).execute("missing@copsstec.com")
    assert token is None
    assert sender.sent == []
