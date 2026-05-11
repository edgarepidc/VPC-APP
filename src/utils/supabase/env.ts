/**
 * Supabase URL + anon/publishable key for browser and server clients.
 *
 * - NEXT_PUBLIC_* are inlined at build time for client bundles.
 * - SUPABASE_URL / SUPABASE_ANON_KEY are server-only on Vercel but available at
 *   runtime on the server; we pass them into the login client via RSC props.
 * Use the HTTPS project URL (https://xxx.supabase.co), not DATABASE_URL.
 */
export function getSupabasePublicUrl(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    undefined
  );
}

export function getSupabasePublicKey(): string | undefined {
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const anonPublic = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const anonServer = process.env.SUPABASE_ANON_KEY?.trim();
  return publishable || anonPublic || anonServer || undefined;
}

export function hasSupabasePublicEnv(): boolean {
  return !!(getSupabasePublicUrl() && getSupabasePublicKey());
}

/** Returns null if URL or key missing. Never throws. */
export function getSupabasePublicEnv(): { url: string; key: string } | null {
  const url = getSupabasePublicUrl();
  const key = getSupabasePublicKey();
  if (!url || !key) return null;
  return { url, key };
}

/** For code paths that only run on server with env guaranteed — else throws. */
export function getSupabasePublicEnvOrThrow(): { url: string; key: string } {
  const env = getSupabasePublicEnv();
  if (!env) {
    throw new Error(
      "Supabase: define NEXT_PUBLIC_SUPABASE_URL (o SUPABASE_URL) y clave publishable o anon (NEXT_PUBLIC_* o SUPABASE_ANON_KEY).",
    );
  }
  return env;
}
