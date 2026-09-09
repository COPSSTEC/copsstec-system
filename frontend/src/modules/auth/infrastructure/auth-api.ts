import type { AccessPolicy, LoginResponse, User } from "@/modules/auth/domain/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ApiErrorBody {
  detail?: string;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
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

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return parseResponse<LoginResponse>(response);
}

export async function getCurrentUser(token: string): Promise<User> {
  const response = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return parseResponse<User>(response);
}

export async function getAccessPolicy(token: string): Promise<AccessPolicy> {
  const response = await fetch(`${API_URL}/api/auth/access`, {
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
