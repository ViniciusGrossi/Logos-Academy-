import type { LibraryResourceKind } from "@/specs/api.contracts";

export type AtlasTab = "conceitos" | "prompts" | "design-systems";

const validTabs = new Set<AtlasTab>([
  "conceitos",
  "prompts",
  "design-systems",
]);

export function normalizeAtlasTab(value: string | undefined): AtlasTab {
  return value && validTabs.has(value as AtlasTab)
    ? (value as AtlasTab)
    : "conceitos";
}

export function libraryKindForTab(
  tab: Exclude<AtlasTab, "conceitos">,
): LibraryResourceKind {
  return tab === "prompts" ? "prompt" : "design_system";
}

export function fillPromptTemplate(
  template: string,
  values: Readonly<Record<string, string>>,
): string {
  return Object.entries(values).reduce(
    (result, [token, value]) =>
      value.trim() ? result.replaceAll(token, value.trim()) : result,
    template,
  );
}

export function youtubeIdFromUrl(value: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    let candidate: string | null = null;

    if (host === "youtu.be") candidate = url.pathname.split("/")[1] ?? null;
    if (host === "youtube.com" || host === "m.youtube.com") {
      candidate = url.searchParams.get("v");
      if (!candidate && url.pathname.startsWith("/embed/")) {
        candidate = url.pathname.split("/")[2] ?? null;
      }
    }

    return candidate && /^[A-Za-z0-9_-]{11}$/.test(candidate)
      ? candidate
      : null;
  } catch {
    return null;
  }
}
