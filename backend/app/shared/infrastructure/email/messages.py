from dataclasses import dataclass, field


@dataclass(frozen=True)
class EmailAttachment:
    filename: str
    content: bytes
    mime_type: str = "application/pdf"


@dataclass(frozen=True)
class OutgoingEmail:
    to: str
    subject: str
    text_body: str
    html_body: str
    attachments: list[EmailAttachment] = field(default_factory=list)
