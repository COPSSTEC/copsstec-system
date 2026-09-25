import type {
  AccessPolicy,
  AffiliationResumeResponse,
  LoginResponse,
  RefreshSessionResponse,
  User,
} from "@/modules/auth/domain/types";
import { authorizedFetch } from "@/modules/auth/infrastructure/authorized-fetch";
import {
  clearSession,
  getStoredRefreshToken,
  storeSession,
} from "@/modules/auth/infrastructure/auth-storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ApiErrorBody {
  detail?: string;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    if (response.status === 204) {
      return undefined as T;
    }
    return response.json() as Promise<T>;
  }

  let message = "No fue posible completar la solicitud.";

  try {
    const body = (await response.json()) as ApiErrorBody;
    message = body.detail ?? message;
  } catch {
    message = response.statusText || message;
  }

  throw new Error(message);
}

function persistLoginSession(data: LoginResponse): LoginResponse {
  storeSession({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  });
  return data;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return persistLoginSession(await parseResponse<LoginResponse>(response));
}

export async function getCurrentUser(token: string): Promise<User> {
  const response = await authorizedFetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return parseResponse<User>(response);
}

export async function getAccessPolicy(token: string): Promise<AccessPolicy> {
  const response = await authorizedFetch(`${API_URL}/api/auth/access`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return parseResponse<AccessPolicy>(response);
}

export async function forgotPassword(
  email: string,
): Promise<{ message: string; reset_token: string | null }> {
  const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  return parseResponse<{ message: string; reset_token: string | null }>(response);
}

export async function resetPassword(input: {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseResponse<{ message: string }>(response);
}

export async function changePassword(
  token: string,
  input: {
    current_password: string;
    password: string;
    password_confirmation: string;
  },
): Promise<User> {
  const response = await authorizedFetch(`${API_URL}/api/auth/change-password`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseResponse<User>(response);
}

export async function requestAffiliationResume(email: string): Promise<AffiliationResumeResponse> {
  const response = await fetch(`${API_URL}/api/auth/affiliation/resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  return parseResponse<AffiliationResumeResponse>(response);
}

export async function verifyAffiliationResume(
  email: string,
  code: string,
): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/api/auth/affiliation/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });

  return persistLoginSession(await parseResponse<LoginResponse>(response));
}

export async function refreshSession(refreshToken: string): Promise<RefreshSessionResponse> {
  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const data = await parseResponse<RefreshSessionResponse>(response);
  storeSession({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  });
  return data;
}

export async function logoutSession(refreshToken: string): Promise<void> {
  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch {
    // El logout es idempotente: si el backend no responde, igual se limpia el cliente.
  }
}

export async function endClientSession(): Promise<void> {
  const refreshToken = getStoredRefreshToken();
  if (refreshToken) {
    await logoutSession(refreshToken);
  }
  clearSession();
}
