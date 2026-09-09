export function safeInternalPath(value: string | null, origin: string): string {
  if (!value?.startsWith("/") || value.includes("\\")) return "/";
  try {
    const destination = new URL(value, origin);
    return destination.origin === origin ? `${destination.pathname}${destination.search}${destination.hash}` : "/";
  } catch {
    return "/";
  }
}
