import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/middleware";

/**
 * Refreshes Supabase Auth cookies on every matched request (required for SSR `getUser()`).
 * Previously this lived in `proxy.ts`, which Next.js does not execute as middleware.
 */
export async function middleware(request: NextRequest) {
  const { supabase, response } = await createClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtectedPath =
    path.startsWith("/dashboard") ||
    path.startsWith("/api/projects") ||
    path.startsWith("/api/tasks");

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
