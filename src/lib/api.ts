// Thin fetch wrapper that injects the demo-user header and parses JSON.
"use client";

import { useStore } from "./store";

export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const role = useStore.getState().role;
  const headers = new Headers(init?.headers);
  headers.set("x-ilm-user", role);
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    let msg = `request failed (${res.status})`;
    try {
      const j = await res.json();
      msg = j.error ?? msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}
