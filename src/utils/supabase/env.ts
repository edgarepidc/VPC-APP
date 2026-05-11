/**
 * Supabase URL + browser-safe key for createBrowserClient / createServerClient.
 * Publishable key is preferred; legacy projects often still use ANON_KEY name.
 */
export function getSupabasePublicUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || undefined;
}

export function getSupabasePublicKey(): string | undefined {
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const anonLegacy = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return publishable || anonLegacy || undefined;
}

export function hasSupabasePublicEnv(): boolean {
  return !!(getSupabasePublicUrl() && getSupabasePublicKey());
}

/** Returns null if URL or key missing (build / misconfigured). Never throws. */
export function getSupabasePublicEnv(): { url: string; key: string } | null {
  const url = getSupabasePublicUrl();
  const key = getSupabasePublicKey();
  if (!url || !key) return null;
  return { url, key };
}

/** Browser-only: throws so the UI can catch and show a message. */
export function getSupabasePublicEnvOrThrow(): { url: string; key: string } {
  const env = getSupabasePublicEnv();
  if (!env) {
    throw new Error(
      "Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (o NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }
  return env;
}
