"use client";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import type { MeProfile } from "@/specs/api.contracts";
import { useLiveApi } from "@/components/prototype/live-api";

const schema = z.object({ feedback: z.string().max(10000), suggestions: z.string().max(10000), resend: z.string().max(10000), results: z.record(z.enum(["met", "needs_adjustment"])), comments: z.record(z.string().max(5000)), savedAt: z.string().datetime() }).strict();
export type LocalReviewDraft = z.infer<typeof schema>;
export function useReviewDraft(submissionId: string) {
  const profile = useLiveApi<MeProfile>("/api/me");
  const key = profile.data?.role === "admin" ? `academy-review:${profile.data.id}:${submissionId}` : null;
  const [draft, setDraft] = useState<LocalReviewDraft | null>(null);
  useEffect(() => {
    setDraft(null); if (!key) return;
    try { const raw = sessionStorage.getItem(key); if (!raw) return; const parsed = schema.safeParse(JSON.parse(raw)); if (parsed.success) setDraft(parsed.data); else sessionStorage.removeItem(key); } catch { /* storage is optional; publishing remains available */ }
  }, [key]);
  const save = useCallback((value: Omit<LocalReviewDraft, "savedAt">) => {
    if (!key) throw new Error("Aguarde a confirmação da sua sessão administrativa.");
    const data = schema.parse({ ...value, savedAt: new Date().toISOString() });
    sessionStorage.setItem(key, JSON.stringify(data)); setDraft(data);
  }, [key]);
  const clear = useCallback(() => { if (key) sessionStorage.removeItem(key); setDraft(null); }, [key]);
  return { draft, save, clear, ready: Boolean(key) };
}
