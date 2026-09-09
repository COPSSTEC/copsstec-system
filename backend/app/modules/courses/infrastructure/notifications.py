from dataclasses import dataclass


@dataclass(frozen=True)
class EmailMessage:
    to: str
    subject: str
    body: str
    attachment_path: str | None = None


class LogEmailNotifier:
    def send(self, message: EmailMessage) -> None:
        print(
            "COURSE_EMAIL",
            {
                "to": message.to,
                "subject": message.subject,
                "attachment_path": message.attachment_path,
            },
        )
