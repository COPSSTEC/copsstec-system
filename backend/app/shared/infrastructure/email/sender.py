import smtplib
import time
from email.message import EmailMessage
from pathlib import Path

from app.core.config import get_settings
from app.shared.infrastructure.email.messages import EmailAttachment, OutgoingEmail
from app.shared.infrastructure.email.templates import render_email


class MailtrapEmailSender:
    raise_on_error = False
    smtp_timeout = 20
    smtp_attempts = 4

    def send(self, to_email: str, subject: str, body: str) -> None:
        _, _, html = render_email("branded_content", {"subject": subject, "content": _text_to_html(body), "text": body})
        self.send_html(to_email, subject, body, html)

    def send_html(
        self,
        to_email: str,
        subject: str,
        text_body: str,
        html_body: str,
        attachments: list[EmailAttachment] | None = None,
    ) -> None:
        if not to_email:
            return
        self.deliver(
            OutgoingEmail(
                to=to_email,
                subject=subject,
                text_body=text_body or _strip(html_body),
                html_body=html_body,
                attachments=list(attachments or []),
            )
        )

    def send_template(
        self,
        to_email: str,
        template_key: str,
        context: dict | None = None,
        attachments: list[EmailAttachment] | None = None,
    ) -> None:
        subject, text_body, html_body = render_email(template_key, context)
        self.send_html(to_email, subject, text_body, html_body, attachments)

    def deliver(self, message: OutgoingEmail) -> None:
        settings = get_settings()
        if not message.to:
            return
        if not settings.smtp_host:
            print(
                "EMAIL_LOG",
                {
                    "to": message.to,
                    "subject": message.subject,
                    "attachments": [item.filename for item in message.attachments],
                },
            )
            return

        envelope = EmailMessage()
        envelope["From"] = settings.smtp_from
        envelope["To"] = message.to
        envelope["Subject"] = message.subject
        envelope.set_content(message.text_body or _strip(message.html_body))
        envelope.add_alternative(message.html_body, subtype="html")
        for attachment in message.attachments:
            maintype, _, subtype = (attachment.mime_type or "application/octet-stream").partition("/")
            envelope.add_attachment(
                attachment.content,
                maintype=maintype or "application",
                subtype=subtype or "octet-stream",
                filename=attachment.filename,
            )

        try:
            self._deliver(settings, envelope)
        except Exception as exc:
            print("EMAIL_SEND_FAILED", {"to": message.to, "subject": message.subject, "error": str(exc)})
            if getattr(self, "raise_on_error", False):
                raise

    def _deliver(self, settings, envelope: EmailMessage) -> None:
        last_error: Exception | None = None
        attempts = max(1, int(getattr(self, "smtp_attempts", 4)))
        timeout = max(1, int(getattr(self, "smtp_timeout", 20)))
        for attempt in range(attempts):
            try:
                with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=timeout) as smtp:
                    if getattr(settings, "smtp_use_tls", True):
                        smtp.starttls()
                    if settings.smtp_user:
                        smtp.login(settings.smtp_user, settings.smtp_password)
                    smtp.send_message(envelope)
                return
            except smtplib.SMTPDataError as exc:
                last_error = exc
                if exc.smtp_code != 550 or "too many" not in str(exc).lower():
                    raise
                time.sleep(1.5 * (attempt + 1))
        if last_error is not None:
            raise last_error


def attachment_from_path(path: str | None) -> EmailAttachment | None:
    if not path:
        return None
    file_path = Path(path)
    if not file_path.is_file():
        return None
    return EmailAttachment(filename=file_path.name, content=file_path.read_bytes())


def _text_to_html(value: str) -> str:
    from html import escape

    return escape(value or "").replace("\n", "<br />")


def _strip(value: str) -> str:
    from app.shared.infrastructure.email.templates import _strip_html

    return _strip_html(value)
