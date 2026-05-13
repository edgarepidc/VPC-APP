import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/middleware";

/**
 * Refresca cookies de sesión de Supabase en cada navegación.
 * Sin esto, los tokens pueden caducar y un simple refresh parece “cerrar sesión”.
 */
export async function middleware(request: NextRequest) {
  try {
    const { supabase, response } = await createClient(request);
    await supabase.auth.getUser();
    return response;
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Excluye estáticos e imágenes; el resto pasa por refresh de sesión.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
