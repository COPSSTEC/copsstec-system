from app.shared.infrastructure.email import MailtrapEmailSender


class SmtpOrLogEmailSender:
    def __init__(self, *, raise_on_error: bool = False) -> None:
        self._sender = MailtrapEmailSender()
        self._sender.raise_on_error = raise_on_error

    def send(self, to_email: str, subject: str, body: str) -> None:
        self._sender.send(to_email, subject, body)

    def send_html(self, to_email: str, subject: str, text_body: str, html_body: str) -> None:
        self._sender.send_html(to_email, subject, text_body, html_body)

    def send_template(self, to_email: str, template_key: str, context: dict | None = None) -> None:
        self._sender.send_template(to_email, template_key, context)
