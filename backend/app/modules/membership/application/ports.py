from typing import Protocol

from app.modules.membership.domain.entities import (
    MembershipInvoice,
    MembershipPayment,
    MembershipRegistrationData,
    MembershipStatus,
    RegisteredMember,
)


class MembershipRepository(Protocol):
    def find_conflict(self, identifier: str, email: str) -> str | None:
        ...

    def register_member(
        self,
        data: MembershipRegistrationData,
        password_hash: str,
        amount: str,
        bank_name: str,
        account_type: str,
        account_number: str,
        account_holder: str,
        account_ruc: str,
    ) -> RegisteredMember:
        ...

    def update_photo(self, user_id: int, foto_id: str) -> None:
        ...

    def get_status(self, user_id: int) -> MembershipStatus | None:
        ...

    def get_payment(self, user_id: int) -> MembershipPayment | None:
        ...

    def save_voucher(self, user_id: int, voucher_path: str) -> MembershipPayment:
        ...

    def get_invoice(self, user_id: int) -> MembershipInvoice | None:
        ...

    def login_email_taken(self, email: str, exclude_user_id: int | None = None) -> bool:
        ...

    def approve_member(
        self,
        user_id: int,
        corporate_email: str,
        password_hash: str,
        reviewed_by: int,
        invoice_number: str,
        invoice_pdf_path: str,
    ) -> RegisteredMember:
        ...

    def next_invoice_number(self, year: int) -> str:
        ...


class MailboxPort(Protocol):
    def create_mailbox(self, email: str, password: str) -> None:
        ...

    def update_or_create_mailbox(self, email: str, password: str) -> None:
        ...


class EmailPort(Protocol):
    def send(self, to_email: str, subject: str, body: str) -> None:
        ...


class InvoiceGenerator(Protocol):
    def generate(self, *, number: str, member_name: str, identifier: str, amount: str) -> bytes:
        ...


class MembershipFileStorage(Protocol):
    def save_photo(self, user_id: int, filename: str, content: bytes, content_type: str) -> str:
        ...

    def save_voucher(self, user_id: int, filename: str, content: bytes, content_type: str) -> str:
        ...

    def save_invoice_pdf(self, user_id: int, number: str, content: bytes) -> str:
        ...
