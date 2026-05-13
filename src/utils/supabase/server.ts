import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseAuthCookieOptions } from "@/utils/supabase/cookie-options";
import { getSupabasePublicEnv } from "@/utils/supabase/env";

export const createClient = async () => {
  const env = getSupabasePublicEnv();
  if (!env) {
    throw new Error("SUPABASE_PUBLIC_ENV_MISSING");
  }
  const cookieStore = await cookies();

  return createServerClient(env.url, env.key, {
    cookieOptions: supabaseAuthCookieOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Can happen when called from Server Components.
        }
      },
    },
  });
};
