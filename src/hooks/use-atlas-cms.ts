"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminAsset, AdminAtlasDetail, AdminAtlasOptions, AdminAssetUploadResponse } from "@/specs/api.contracts";
import { apiQuery, apiMutation } from "@/components/prototype/live-api";

export function useAtlasQuery<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const reload = useCallback(async () => {
    const request = ++sequence.current;
    if (!url) { setData(null); setLoading(false); return; }
    setLoading(true); setError(null); setData(null);
    try { const value = await apiQuery<T>(url); if (request === sequence.current) setData(value); }
    catch (cause) { if (request === sequence.current) setError(cause instanceof Error ? cause.message : "Não foi possível carregar."); }
    finally { if (request === sequence.current) setLoading(false); }
  }, [url]);
  useEffect(() => { const guard = sequence; void reload(); return () => { guard.current++; }; }, [reload]);
  return { data, loading, error, reload, setData };
}
export function useAtlasOptions() {
  const [options, setOptions] = useState<AdminAtlasOptions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const reload = useCallback(async () => {
    const request = ++sequence.current;
    setError(null);
    try {
      const first = await apiQuery<AdminAtlasOptions>("/api/admin/atlas/options?limit=50");
      const items = [...first.lessons.items];
      const seen = new Set<string>(); let cursor = first.lessons.nextCursor;
      while (cursor) { if (seen.has(cursor)) throw new Error("Paginação das aulas inválida."); seen.add(cursor); const next = await apiQuery<AdminAtlasOptions>(`/api/admin/atlas/options?limit=50&cursor=${encodeURIComponent(cursor)}`); items.push(...next.lessons.items); cursor = next.lessons.nextCursor; }
      if (request === sequence.current) setOptions({ ...first, lessons: { items: items.sort((a, b) => a.cyclePosition - b.cyclePosition || a.position - b.position), nextCursor: null } });
    } catch (cause) { if (request === sequence.current) setError(cause instanceof Error ? cause.message : "Não foi possível carregar as aulas."); }
  }, []);
  useEffect(() => { const guard = sequence; void reload(); return () => { guard.current++; }; }, [reload]);
  return { data: options, error, reload, loading: !options && !error };
}
export function useAtlasMutation() {
  const [pending, setPending] = useState(false); const [error, setError] = useState<string | null>(null);
  const run = useCallback(async <T,>(url: string, method: "POST" | "PATCH", body: unknown): Promise<T> => {
    setPending(true); setError(null);
    try { return await apiMutation<T>(url, method, body); }
    catch (cause) { const message = cause instanceof Error ? cause.message : "Não foi possível concluir."; setError(message); throw cause; }
    finally { setPending(false); }
  }, []);
  return { run, pending, error, clearError: () => setError(null) };
}
export function useAtlasAssetUpload() {
  const [pending, setPending] = useState(false); const [error, setError] = useState<string | null>(null);
  async function upload(ownerId: string, ownerKind: "concept" | "resource", file: File, alt: string, caption: string): Promise<AdminAsset> {
    const mime = file.type;
    if (mime !== "image/png" && mime !== "image/jpeg" && mime !== "image/webp") throw new Error("Envie PNG, JPEG ou WebP.");
    if (file.size < 1 || file.size > 5 * 1024 * 1024) throw new Error("O arquivo deve ter até 5 MB.");
    if (!alt.trim()) throw new Error("Descreva a imagem para quem usa leitor de tela.");
    setPending(true); setError(null);
    try {
      const authorized = await apiMutation<AdminAssetUploadResponse>("/api/admin/atlas/assets/upload-url", "POST", { ownerId, ownerKind, filename: file.name, contentType: mime, sizeBytes: file.size });
      const form = new FormData(); form.append("cacheControl", "3600"); form.append("", file);
      const response = await fetch(authorized.signedUploadUrl, { method: "PUT", body: form, headers: { "x-upsert": "false" }, signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error("Falha no envio da imagem. Tente novamente.");
      return await apiMutation<AdminAsset>(`/api/admin/atlas/assets/${authorized.asset.id}/finalize`, "POST", { alt: alt.trim(), caption: caption.trim() });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível enviar a imagem."); throw cause; }
    finally { setPending(false); }
  }
  return { upload, pending, error, refresh: (id: string) => apiQuery<AdminAtlasDetail>(`/api/admin/atlas/${id}`) };
}
