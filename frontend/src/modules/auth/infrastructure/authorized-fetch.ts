import {
  clearSession,
  getStoredRefreshToken,
  getStoredToken,
  storeSession,
} from "@/modules/auth/infrastructure/auth-storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const SESSION_EXPIRED_EVENT = "copsstec:session-expired";

export class SessionExpiredError extends Error {
  constructor(message = "La sesión expiró. Vuelve a iniciar sesión.") {
    super(message);
    this.name = "SessionExpiredError";
  }
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
      return false;
    }

    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      return false;
    }

    const data = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
    };

    if (!data.access_token) {
      return false;
    }

    storeSession({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    });
    return true;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

function expireSession(): never {
  clearSession();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  throw new SessionExpiredError();
}

function withAccessToken(init: RequestInit | undefined, accessToken: string | null): Headers {
  const headers = new Headers(init?.headers);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  } else {
    headers.delete("Authorization");
  }
  return headers;
}

export async function authorizedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, {
    ...init,
    headers: withAccessToken(init, getStoredToken()),
  });

  if (response.status !== 401) {
    return response;
  }

  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    expireSession();
  }

  const retry = await fetch(input, {
    ...init,
    headers: withAccessToken(init, getStoredToken()),
  });

  if (retry.status === 401) {
    expireSession();
  }

  return retry;
}
