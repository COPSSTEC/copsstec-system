from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.modules.auth.domain.entities import AccessPolicy, Profile, User


class ProfileResponse(BaseModel):
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

    @classmethod
    def from_domain(cls, profile: Profile) -> "ProfileResponse":
        return cls(**profile.__dict__)


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    state_id: int
    email_verified_at: datetime | None
    last_conexion: datetime | None
    must_change_password: bool
    roles: list[str]
    access_level: str
    allowed_routes: list[str]
    profile: ProfileResponse | None

    @classmethod
    def from_domain(
        cls,
        user: User,
        access_policy: AccessPolicy,
    ) -> "UserResponse":
        return cls(
            id=user.id,
            name=user.name,
            email=user.email,
            state_id=user.state_id,
            email_verified_at=user.email_verified_at,
            last_conexion=user.last_conexion,
            must_change_password=user.must_change_password,
            roles=access_policy.roles,
            access_level=access_policy.access_level,
            allowed_routes=access_policy.allowed_routes,
            profile=(
                ProfileResponse.from_domain(user.profile)
                if user.profile is not None
                else None
            ),
        )


class NavigationItemResponse(BaseModel):
    label: str
    href: str


class AccessPolicyResponse(BaseModel):
    roles: list[str]
    access_level: str
    allowed_routes: list[str]
    navigation: list[NavigationItemResponse]

    @classmethod
    def from_domain(cls, access_policy: AccessPolicy) -> "AccessPolicyResponse":
        return cls(
            roles=access_policy.roles,
            access_level=access_policy.access_level,
            allowed_routes=access_policy.allowed_routes,
            navigation=[
                NavigationItemResponse(**item)
                for item in access_policy.navigation
            ],
        )


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    reset_token: str | None = None


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    token: str = Field(min_length=1)
    password: str = Field(min_length=8)
    password_confirmation: str = Field(min_length=8)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1)
    password: str = Field(min_length=8)
    password_confirmation: str = Field(min_length=8)


class MessageResponse(BaseModel):
    message: str
