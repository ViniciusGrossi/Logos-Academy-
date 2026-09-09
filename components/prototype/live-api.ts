"use client";

import { useCallback, useEffect, useState } from "react";
import { demoApi, isDemoMode } from "@/src/mocks/demo-api";

export type ApiFailure = { code?: string; message: string };

export function useLiveApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiFailure | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const load = useCallback(async () => {
    if (!url) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      if (isDemoMode()) { setData(await demoApi<T>(url, "GET")); return; }
      const response = await fetch(url, { credentials: "same-origin" });
      const result: unknown = await response.json();
      if (!response.ok || !isSuccess<T>(result)) throw new Error(isFailure(result) ? result.error.message : "Não foi possível carregar os dados.");
      setData(result.data);
    } catch (cause) { setError({ message: cause instanceof Error ? cause.message : "Não foi possível carregar os dados." }); }
    finally { setLoading(false); }
  }, [url]);
  useEffect(() => { void load(); }, [load]);
  return { data, error, loading, reload: load };
}

export async function apiMutation<T>(url: string, method: "POST" | "PUT" | "PATCH" | "DELETE", body: unknown): Promise<T> {
  if (isDemoMode()) return demoApi<T>(url, method, isJsonObject(body) ? body : undefined);
  const response = await fetch(url, { method, credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const result: unknown = await response.json();
  if (!response.ok || !isSuccess<T>(result)) throw new Error(isFailure(result) ? result.error.message : "Não foi possível salvar.");
  return result.data;
}

function isSuccess<T>(value: unknown): value is { ok: true; data: T } { return typeof value === "object" && value !== null && (value as { ok?: unknown }).ok === true; }
function isFailure(value: unknown): value is { ok: false; error: ApiFailure } { return typeof value === "object" && value !== null && (value as { ok?: unknown }).ok === false && "error" in value; }
function isJsonObject(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
