import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicUrl } from "@/utils/supabase/env";

export function createAdminClient() {
  const supabaseUrl = getSupabasePublicUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl && !serviceRoleKey) {
    throw new Error(
      "Faltan la URL HTTPS del proyecto Supabase (p. ej. NEXT_PUBLIC_SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY. Revisa Vercel → Environment Variables → Production y /api/health/env.",
    );
  }
  if (!supabaseUrl) {
    throw new Error(
      "Falta la URL HTTPS de la API de Supabase (NEXT_PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_URL o SUPABASE_URL con https://…supabase.co). No uses la URI de Postgres. Ver /api/health/env.",
    );
  }
  if (!serviceRoleKey) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor (Vercel → Production). No la marques como NEXT_PUBLIC_. Ver /api/health/env.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
