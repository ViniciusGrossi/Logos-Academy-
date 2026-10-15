"use client";

import { useCallback, useEffect, useState } from "react";

/** Preserva parâmetros vizinhos e restaura abas/filtros ao usar Voltar/Avançar. */
export function useAdminUrlState<Value extends string>(key: string, fallback: Value, allowed?: readonly Value[]) {
  const read = useCallback((): Value => {
    if (typeof window === "undefined") return fallback;
    const value = new URLSearchParams(window.location.search).get(key);
    return value !== null && (!allowed || allowed.includes(value as Value)) ? value as Value : fallback;
  }, [key, fallback, allowed]);
  const [value, setValue] = useState<Value>(fallback);
  useEffect(() => {
    const restore = () => setValue(read());
    restore(); window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [read]);
  const update = useCallback((next: Value) => {
    const url = new URL(window.location.href);
    if (next === fallback) url.searchParams.delete(key); else url.searchParams.set(key, next);
    window.history.pushState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    setValue(next);
  }, [key, fallback]);
  return [value, update] as const;
}
