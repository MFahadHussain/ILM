// Thin fetch wrapper that injects the demo-user header and parses JSON.
"use client";

import { useStore } from "./store";

export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const { userId, role } = useStore.getState();
  const headers = new Headers(init?.headers);
  // Send the real userId if available; fall back to the role string for
  // legacy demo accounts that have no userId in localStorage.
  headers.set("x-ilm-user", userId ?? role);
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const res = await fetch(path, { ...init, headers });
  const text = await res.text();
  if (!res.ok) {
    let msg = `request failed (${res.status})`;
    if (text) {
      try {
        const j = JSON.parse(text);
        msg = j.error ?? msg;
      } catch {
        /* ignore */
      }
    }
    throw new Error(msg);
  }
  return (text ? JSON.parse(text) : {}) as T;
}
