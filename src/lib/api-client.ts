"use client";

// Shared API helper with auth token injection and JSON handling.
// All frontend fetch calls should go through this.

import { useAppStore } from "@/lib/store";

export async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = useAppStore.getState().token;
  const user = useAppStore.getState().user;

  // Inject userId as query param for endpoints that need it
  const finalUrl = user && !url.includes("userId=")
    ? appendUserId(url, user.id)
    : url;

  const res = await fetch(finalUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = `Ralat ${res.status}`;
    try {
      const err = await res.json();
      message = err.error || err.message || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

function appendUserId(url: string, userId: string): string {
  // Only append for GET requests to endpoints that accept userId
  if (!url.startsWith("/api/")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}userId=${userId}`;
}

// Convenience methods
export const api = {
  get: <T = unknown>(url: string) => apiFetch<T>(url, { method: "GET" }),
  post: <T = unknown>(url: string, body?: unknown) =>
    apiFetch<T>(url, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T = unknown>(url: string, body?: unknown) =>
    apiFetch<T>(url, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T = unknown>(url: string) => apiFetch<T>(url, { method: "DELETE" }),
};
