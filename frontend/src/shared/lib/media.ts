export function resolveMediaSrc(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }

  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:") ||
    path.startsWith("/media/brand/") ||
    path.startsWith("/media/login/")
  ) {
    return path;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  return `${apiUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
