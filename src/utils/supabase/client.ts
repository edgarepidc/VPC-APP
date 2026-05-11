import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicEnvOrThrow } from "@/utils/supabase/env";

export function createClient() {
  const { url, key } = getSupabasePublicEnvOrThrow();
  return createBrowserClient(url, key);
}
