import { createBrowserClient } from "@supabase/ssr";

import { assertSupabasePublicEnv } from "@/utils/supabase/env";

export function createClient() {
  const { url, key } = assertSupabasePublicEnv();
  return createBrowserClient(url, key);
}
