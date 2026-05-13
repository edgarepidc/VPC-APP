/** Opciones de cookies de Auth (Supabase SSR): HTTPS en prod, path global. */
export function supabaseAuthCookieOptions() {
  return {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
