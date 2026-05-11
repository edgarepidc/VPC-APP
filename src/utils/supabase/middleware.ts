import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { assertSupabasePublicEnv } from "@/utils/supabase/env";

export const createClient = async (request: NextRequest) => {
  const { url, key } = assertSupabasePublicEnv();
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(url, key, {
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
