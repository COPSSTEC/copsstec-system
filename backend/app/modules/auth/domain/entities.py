from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class Profile:
    id: int
    user_id: int
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
    state_id: int
    type_profile: str | None
    date_exit: str | None
    fourth_title: str | None
    type_commision: str | None
    codigo_senescyt_cuarto: str | None
    cod: str | None
    gender: str | None


@dataclass(frozen=True)
class User:
    id: int
    name: str
    email: str
    password_hash: str
    state_id: int
    email_verified_at: datetime | None
    last_conexion: datetime | None
    roles: list[str]
    profile: Profile | None


@dataclass(frozen=True)
class AccessPolicy:
    access_level: str
    roles: list[str]
    allowed_routes: list[str]
    navigation: list[dict[str, str]]
