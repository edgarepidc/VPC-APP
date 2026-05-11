import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { assertSupabasePublicEnv } from "@/utils/supabase/env";

export const createClient = async () => {
  const { url, key } = assertSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
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
