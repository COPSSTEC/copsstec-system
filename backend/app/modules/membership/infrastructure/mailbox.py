import httpx

from app.core.config import get_settings
from app.modules.membership.domain.exceptions import MailboxError


class MailInABoxMailbox:
    def create_mailbox(self, email: str, password: str) -> None:
        settings = get_settings()
        if not settings.mailbox_admin_email or not settings.mailbox_admin_password:
            raise MailboxError(
                "Faltan MAILBOX_ADMIN_EMAIL o MAILBOX_ADMIN_PASSWORD. No se creó el buzón corporativo.",
            )

        try:
            response = httpx.post(
                f"{settings.mailbox_api_url.rstrip('/')}/admin/mail/users/add",
                auth=(settings.mailbox_admin_email, settings.mailbox_admin_password),
                data={"email": email, "password": password},
                timeout=30.0,
                trust_env=False,
            )
        except httpx.HTTPError as exc:
            raise MailboxError("No se pudo conectar con Mail-in-a-Box.") from exc

        body = (response.text or "").strip()
        if response.is_success or "already exists" in body.lower():
            return

        raise MailboxError(body[:300] or "Error al crear usuario en Mail-in-a-Box.")

    def update_or_create_mailbox(self, email: str, password: str) -> None:
        settings = get_settings()
        if not settings.mailbox_admin_email or not settings.mailbox_admin_password:
            raise MailboxError(
                "Faltan MAILBOX_ADMIN_EMAIL o MAILBOX_ADMIN_PASSWORD. No se actualizó el buzón corporativo.",
            )

        try:
            response = httpx.post(
                f"{settings.mailbox_api_url.rstrip('/')}/admin/mail/users/password",
                auth=(settings.mailbox_admin_email, settings.mailbox_admin_password),
                data={"email": email, "password": password},
                timeout=30.0,
                trust_env=False,
            )
        except httpx.HTTPError as exc:
            raise MailboxError("No se pudo conectar con Mail-in-a-Box.") from exc

        if response.is_success:
            return

        self.create_mailbox(email, password)
