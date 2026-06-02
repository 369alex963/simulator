/**
 * Typed fetch wrapper to the Django DRF backend.
 * Base URL defaults to http://127.0.0.1:8000; override with
 * NEXT_PUBLIC_API_URL env var for production.
 */

// In the browser we use Next.js rewrites so /api/* proxies to Django on the same
// origin — this makes session cookies work without CORS issues.
// On the server (SSR) we hit the backend directly.
const BASE =
  typeof window === "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "")
    : "";

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, data: unknown) {
    super(`API error ${status}`);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let data: unknown;
    try { data = await res.json(); } catch { data = null; }
    throw new ApiError(res.status, data);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
