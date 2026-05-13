import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { supabaseAuthCookieOptions } from "@/utils/supabase/cookie-options";
import { getSupabasePublicEnv } from "@/utils/supabase/env";

export const createClient = async (request: NextRequest) => {
  const env = getSupabasePublicEnv();
  if (!env) {
    throw new Error("SUPABASE_PUBLIC_ENV_MISSING");
  }
  const { url, key } = env;
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(url, key, {
    cookieOptions: supabaseAuthCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers?: Record<string, string | string[]>) {
        // Do not call request.cookies.set — it throws on Vercel Edge / Next 15+.
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        if (headers) {
          Object.entries(headers).forEach(([key, value]) => {
            if (value === undefined) return;
            response.headers.set(key, Array.isArray(value) ? value.join(", ") : value);
          });
        }
      },
    },
  });

  return { supabase, response };
};
