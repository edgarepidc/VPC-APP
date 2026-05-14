const localhostHosts = new Set(["localhost", "127.0.0.1", "::1"]);

export function getAppUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";

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
