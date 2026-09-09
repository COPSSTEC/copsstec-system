from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.modules.members.domain.entities import Member, MemberColumn, MemberListResult, MemberWriteData


class MemberColumnResponse(BaseModel):
    id: str
    label: str
    source: str
    default_visible: bool
    sortable: bool
    filterable: bool
    filter_type: str

    @classmethod
    def from_domain(cls, column: MemberColumn) -> "MemberColumnResponse":
        return cls(
            id=column.id,
            label=column.label,
            source=column.source,
            default_visible=column.default_visible,
            sortable=column.sortable,
            filterable=column.filterable,
            filter_type=column.filter_type,
        )


class MemberResponse(BaseModel):
    user_id: int
    profile_id: int | None
    name: str
    login_email: str
    state_id: int
    state_label: str
    last_conexion: datetime | None
    names: str
    lastname: str
    identifier: str
    email: str
    birtday: str
    blood_type: str
    mobile_phone: str
    fixed_phone: str
    title_academic: str
    level_academic: str
    cod_senescyt: str
    date_register: str
    linkdink: str
    want_notifications: bool
    is_work: bool
    foto_id: str
    province: str | None
    city: str | None
    street_principal: str | None
    street_secondary: str | None
    type_profile: str | None
    date_exit: str | None
    fourth_title: str | None
    type_commision: str | None
    codigo_senescyt_cuarto: str | None
    cod: str | None
    gender: str | None
    created_at: datetime | None

    @classmethod
    def from_domain(cls, member: Member) -> "MemberResponse":
        return cls(**member.__dict__)


class MemberListResponse(BaseModel):
    items: list[MemberResponse]
    page: int
    page_size: int
    total: int
    columns: list[MemberColumnResponse]

    @classmethod
    def from_domain(cls, result: MemberListResult) -> "MemberListResponse":
        return cls(
            items=[MemberResponse.from_domain(item) for item in result.items],
            page=result.page,
            page_size=result.page_size,
            total=result.total,
            columns=[MemberColumnResponse.from_domain(column) for column in result.columns],
        )


class MemberWriteRequest(BaseModel):
    names: str = Field(min_length=1, max_length=255)
    lastname: str = Field(min_length=1, max_length=255)
    identifier: str = Field(min_length=1, max_length=32)
    email: EmailStr
    login_email: EmailStr | None = None
    birtday: str = Field(min_length=1, max_length=32)
    mobile_phone: str = Field(min_length=1, max_length=255)
    date_register: str = Field(min_length=1, max_length=32)
    blood_type: str = ""
    fixed_phone: str = ""
    title_academic: str = ""
    level_academic: str = ""
    cod_senescyt: str = ""
    linkdink: str = ""
    want_notifications: bool = True
    is_work: bool = False
    foto_id: str = ""
    province: str | None = None
    city: str | None = None
    street_principal: str | None = None
    street_secondary: str | None = None
    type_profile: str | None = "miembro"
    fourth_title: str | None = None
    type_commision: str | None = None
    codigo_senescyt_cuarto: str | None = None
    gender: str | None = None

    def to_write_data(self) -> MemberWriteData:
        login_email = str(self.login_email or self.email)
        fourth_title = (self.fourth_title or "").strip() or None
        senescyt_cuarto = (self.codigo_senescyt_cuarto or "").strip() or None
        return MemberWriteData(
            names=self.names,
            lastname=self.lastname,
            identifier=self.identifier,
            email=str(self.email),
            login_email=login_email,
            birtday=self.birtday,
            mobile_phone=self.mobile_phone,
            date_register=self.date_register,
            blood_type=self.blood_type,
            fixed_phone=self.fixed_phone,
            title_academic=self.title_academic,
            level_academic=self.level_academic,
            cod_senescyt=self.cod_senescyt,
            linkdink=self.linkdink,
            want_notifications=self.want_notifications,
            is_work=self.is_work,
            foto_id=self.foto_id,
            province=self.province,
            city=self.city,
            street_principal=self.street_principal,
            street_secondary=self.street_secondary,
            type_profile=(self.type_profile or "miembro").strip() or "miembro",
            fourth_title=fourth_title,
            type_commision=(self.type_commision or "NA").strip() or "NA",
            codigo_senescyt_cuarto=senescyt_cuarto if fourth_title else None,
            gender=self.gender,
        )


class MemberCreatedResponse(BaseModel):
    member: MemberResponse
    temporary_password: str
    message: str


class CredentialsResponse(BaseModel):
    message: str
    temporary_password: str
    member: MemberResponse


class MessageResponse(BaseModel):
    message: str
    member: MemberResponse
