const localhostHosts = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * URL pública de la app (origen, sin path).
 * - Preferir NEXT_PUBLIC_APP_URL en Vercel (p. ej. https://app.vpc.services).
 * - Si falta en un deploy de Vercel, se usa VERCEL_URL (https://…vercel.app) para
 *   que redirectTo de invitaciones no caiga en localhost.
 */
function resolveAppUrlRaw(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, "");
    return `https://${host}`;
  }

  return "http://localhost:3000";
}

export function getAppUrl() {
  const raw = resolveAppUrlRaw();

  try {
    const url = new URL(raw);
    const isLocalhost = localhostHosts.has(url.hostname);
    const isProduction = process.env.NODE_ENV === "production";
    const needsAttention = isProduction && (isLocalhost || url.protocol !== "https:");
    /** GoTrue rechaza redirectTo si apunta al host del proyecto (invitaciones por correo). */
    const isSupabaseProjectHost = /\.supabase\.co$/i.test(url.hostname);

    return {
      value: url.origin,
      needsAttention,
      isSupabaseProjectHost,
    };
  } catch {
    return {
      value: "http://localhost:3000",
      needsAttention: true,
      isSupabaseProjectHost: false,
    };
  }
}
