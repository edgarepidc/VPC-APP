import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { supabaseAuthCookieOptions } from "@/utils/supabase/cookie-options";
import { getSupabasePublicEnv } from "@/utils/supabase/env";

function safeNextPath(next: string | null): string {
  const fallback = "/login/restablecer";
  if (!next) return fallback;
  let decoded = next;
  try {
    decoded = decodeURIComponent(next);
  } catch {
    return fallback;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return fallback;
  return decoded;
}

/**
 * Intercambia `code` (PKCE) tras enlaces de Auth (p. ej. recuperación de contraseña)
 * y redirige a `next` con cookies de sesión ya fijadas en la respuesta.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));
  const env = getSupabasePublicEnv();

  if (!env) {
    const login = new URL("/login", url.origin);
    login.searchParams.set("error", "Faltan variables publicas de Supabase.");
    return NextResponse.redirect(login);
  }

  const destination = new URL(next, url.origin);

  if (!code) {
    const olvido = new URL("/login/olvido", url.origin);
    olvido.searchParams.set(
      "message",
      "Enlace incompleto o caducado. Solicita un nuevo correo de recuperacion.",
    );
    return NextResponse.redirect(olvido);
  }

  const response = NextResponse.redirect(destination);

  const supabase = createServerClient(env.url, env.key, {
    cookieOptions: supabaseAuthCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const login = new URL("/login/olvido", url.origin);
    login.searchParams.set(
      "error",
      "No se pudo validar el enlace. Solicita un correo nuevo.",
    );
    return NextResponse.redirect(login);
  }

  return response;
}
