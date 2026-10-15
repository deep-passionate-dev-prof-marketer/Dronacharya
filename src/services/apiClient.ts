/**
 * Small JSON client for the app's own API: one shape for every call ({ ok, data } or { ok, error }),
 * errors in words people can act on, and a hook for "load this, show loading/error, reload".
 */
import React from "react";

export type ApiResult<T> = { ok: true; data: T; status: number } | { ok: false; error: string; status: number; data?: any };

export async function api<T = any>(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", url: string, body?: unknown): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      credentials: "same-origin",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    return { ok: false, status: 0, error: "Can't reach the server. Check your connection and try again." };
  }
  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : null;
  if (res.ok && isJson) return { ok: true, status: res.status, data: data as T };
  const fallback =
    res.status === 401
      ? "Your sign-in has expired. Sign in again."
      : res.status === 403
      ? "You don't have access to this."
      : res.status === 404
      ? "Not found."
      : res.status === 429
      ? "Too many requests. Wait a moment and try again."
      : !isJson
      ? "The server sent an unexpected reply."
      : `Something went wrong (${res.status}).`;
  return { ok: false, status: res.status, error: data?.error || fallback, data };
}

/** Loads JSON from `url` (null = don't load). Keeps the last data while reloading. */
export function useResource<T>(url: string | null) {
  const [state, setState] = React.useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: Boolean(url) });
  const [nonce, setNonce] = React.useState(0);
  React.useEffect(() => {
    if (!url) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    api<T>("GET", url).then((r) => {
      if (cancelled) return;
      setState((s) => (r.ok ? { data: r.data, error: null, loading: false } : { data: s.data, error: r.error, loading: false }));
    });
    return () => {
      cancelled = true;
    };
  }, [url, nonce]);
  const reload = React.useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}
