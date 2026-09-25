import { authorizedFetch } from "@/modules/auth/infrastructure/authorized-fetch";
import type { AdminBlog, PublicBlog, PublicBlogListItem } from "@/modules/blogs/domain/types";

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
    message = typeof body.detail === "string" ? body.detail : message;
  } catch {
    message = response.statusText || message;
  }

  throw new Error(message);
}

function authHeaders(token: string, json = false): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

export async function listPublicBlogs(): Promise<PublicBlogListItem[]> {
  const response = await fetch(`${API_URL}/api/blogs/public`, {
    cache: "no-store",
  });

  return parseResponse<PublicBlogListItem[]>(response);
}

export async function getPublicBlog(blogId: number): Promise<PublicBlog> {
  const response = await fetch(`${API_URL}/api/blogs/public/${blogId}`, {
    cache: "no-store",
  });

  return parseResponse<PublicBlog>(response);
}

export async function listAdminBlogs(token: string): Promise<AdminBlog[]> {
  const response = await authorizedFetch(`${API_URL}/api/blogs/admin`, {
    headers: authHeaders(token),
  });

  return parseResponse<AdminBlog[]>(response);
}

export async function getAdminBlog(token: string, blogId: number): Promise<AdminBlog> {
  const response = await authorizedFetch(`${API_URL}/api/blogs/admin/${blogId}`, {
    headers: authHeaders(token),
  });

  return parseResponse<AdminBlog>(response);
}

export async function createBlog(token: string, input: FormData): Promise<AdminBlog> {
  const response = await authorizedFetch(`${API_URL}/api/blogs/admin`, {
    method: "POST",
    headers: authHeaders(token),
    body: input,
  });

  return parseResponse<AdminBlog>(response);
}

export async function updateBlog(
  token: string,
  blogId: number,
  input: FormData,
): Promise<AdminBlog> {
  const response = await authorizedFetch(`${API_URL}/api/blogs/admin/${blogId}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: input,
  });

  return parseResponse<AdminBlog>(response);
}

export async function setBlogVisibility(
  token: string,
  blogId: number,
  stateId: number,
): Promise<AdminBlog> {
  const response = await authorizedFetch(`${API_URL}/api/blogs/admin/${blogId}/visibility`, {
    method: "PATCH",
    headers: authHeaders(token, true),
    body: JSON.stringify({ state_id: stateId }),
  });

  return parseResponse<AdminBlog>(response);
}

export async function deleteBlog(token: string, blogId: number): Promise<void> {
  const response = await authorizedFetch(`${API_URL}/api/blogs/admin/${blogId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

  await parseResponse<void>(response);
}
