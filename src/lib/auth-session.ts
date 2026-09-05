export function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return "/";
  let path = raw.trim();
  try {
    path = decodeURIComponent(path);
  } catch {
    return "/";
  }
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    return "/";
  }
  if (path.includes("://")) return "/";
  return path;
}

export function isAnonymousClaims(claims: Record<string, unknown> | undefined) {
  return claims?.is_anonymous === true;
}

export function isRecoveryClaims(claims: Record<string, unknown> | undefined) {
  const amr = claims?.amr;
  if (!Array.isArray(amr)) return false;
  return amr.some((entry) => {
    if (typeof entry === "string") return entry === "recovery";
    if (entry && typeof entry === "object" && "method" in entry) {
      return (entry as { method?: unknown }).method === "recovery";
    }
    return false;
  });
}
