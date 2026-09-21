from dataclasses import dataclass, field

from app.shared.infrastructure.email import MailtrapEmailSender, attachment_from_path


@dataclass(frozen=True)
class EmailMessage:
    to: str
    subject: str
    body: str
    attachment_path: str | None = None
    template_key: str | None = None
    context: dict = field(default_factory=dict)


class LogEmailNotifier:
    def __init__(self) -> None:
        self._sender = MailtrapEmailSender()

    def send(self, message: EmailMessage) -> None:
        if not message.to:
            return
        attachments = []
        attachment = attachment_from_path(message.attachment_path)
        if attachment is not None:
            attachments.append(attachment)
        elif message.attachment_path:
            print("COURSE_EMAIL_MISSING_ATTACHMENT", {"path": message.attachment_path})

        self._sender.send_template(
            message.to,
            message.template_key or "branded_content",
            message.context
            or {"subject": message.subject, "content": message.body, "text": message.body},
            attachments=attachments,
        )
