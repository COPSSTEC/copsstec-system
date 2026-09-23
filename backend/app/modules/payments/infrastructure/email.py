from app.shared.infrastructure.email import MailtrapEmailSender


class PaymentsEmailSender:
    def __init__(self, *, raise_on_error: bool = False) -> None:
        self._sender = MailtrapEmailSender()
        self._sender.raise_on_error = raise_on_error
        self._sender.smtp_timeout = 8
        self._sender.smtp_attempts = 1

    def send_template(self, to_email: str, template_key: str, context: dict | None = None) -> None:
        self._sender.send_template(to_email, template_key, context)
