/** Errores internos de Next.js al hacer redirect/notFound; no son fallos reales. */
export function isNextNavigationError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const digest = (error as { digest?: string }).digest;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND"))
  );
}

export function flashMessageFromParam(raw?: string): string | null {
  if (!raw?.trim()) return null;
  const decoded = decodeURIComponent(raw.replace(/\+/g, " "));
  if (decoded === "NEXT_REDIRECT" || decoded.includes("NEXT_REDIRECT")) {
    return null;
  }
  return decoded;
}
