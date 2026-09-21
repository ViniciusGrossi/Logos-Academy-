const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/u;

const ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "youtu.be",
  "www.youtu.be",
]);

/**
 * Normaliza uma URL do YouTube para o `videoId` de 11 caracteres, aceitando apenas os
 * formatos de distribuição não listada previstos na spec (watch, youtu.be, embed, shorts,
 * youtube-nocookie, m.youtube). Qualquer outro domínio ou um ID malformado retorna `null`.
 * Não faz chamada de rede: apenas parsing e validação de formato.
 */
export function normalizeYouTubeVideoId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;

  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) return null;

  const candidate = extractCandidate(host, parsed);
  if (!candidate) return null;
  return VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
}

function extractCandidate(host: string, url: URL): string | null {
  if (host === "youtu.be" || host === "www.youtu.be") {
    const [segment] = url.pathname.slice(1).split("/");
    return segment || null;
  }
  if (url.pathname === "/watch") {
    return url.searchParams.get("v");
  }
  const match = /^\/(?:embed|shorts)\/([^/?#]+)/u.exec(url.pathname);
  return match ? match[1] : null;
}
