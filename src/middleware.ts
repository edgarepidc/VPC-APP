import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const user = request.cookies.get("embus_user")?.value;
  const isProtectedPath =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/api/projects") ||
    request.nextUrl.pathname.startsWith("/api/tasks");

  if (isProtectedPath && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/projects", "/api/tasks"],
};
