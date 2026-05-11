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

export function assertSupabasePublicEnv(): { url: string; key: string } {
  const url = getSupabasePublicUrl();
  const key = getSupabasePublicKey();
  if (!url || !key) {
    throw new Error(
      "Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (o la legacy NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }
  return { url, key };
}
