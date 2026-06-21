"use client";

import * as React from "react";
import { useStore } from "./store";

// Simple data-fetching hook with loading/error + refresh on the global refreshKey.
export function useApi<T>(path: string | null) {
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(!!path);
  const refreshKey = useStore((s) => s.refreshKey);
  const userId = useStore((s) => s.userId);
  const role = useStore((s) => s.role);

  // Send the real userId if available; fall back to the role string.
  const authHeader = userId ?? role;

  React.useEffect(() => {
    if (!path) {
      setData(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    fetch(path, { headers: { "x-ilm-user": authHeader } })
      .then(async (res) => {
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? `error ${res.status}`);
        }
        return res.json();
      })
      .then((j) => {
        if (active) {
          setData(j);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message ?? "failed");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [path, refreshKey, authHeader]);

  return { data, error, loading };
}
