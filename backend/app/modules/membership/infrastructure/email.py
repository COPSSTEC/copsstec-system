import smtplib
from email.message import EmailMessage

from app.core.config import get_settings


class SmtpOrLogEmailSender:
    def send(self, to_email: str, subject: str, body: str) -> None:
        settings = get_settings()
        if not settings.smtp_host:
            print("MEMBERSHIP_EMAIL", {"to": to_email, "subject": subject, "body": body})
            return

        message = EmailMessage()
        message["From"] = settings.smtp_from
        message["To"] = to_email
        message["Subject"] = subject
        message.set_content(body)

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
            smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(message)
