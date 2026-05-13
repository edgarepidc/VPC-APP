import { NextResponse } from "next/server";

import { getSupabasePublicEnv, getSupabasePublicUrl } from "@/utils/supabase/env";

export const dynamic = "force-dynamic";

const ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PLATFORM_OWNER_EMAIL",
  "PLATFORM_SUPERADMIN_EMAILS",
] as const;

function urlEnvHint(name: string, raw: string | undefined) {
  const t = raw?.trim();
  if (!t) return { name, present: false, validSupabaseHttps: false };
  const isPostgres = /^postgres(ql)?:/i.test(t);
  const validSupabaseHttps = !isPostgres && /^https:\/\//i.test(t);
  return {
    name,
    present: true,
    validSupabaseHttps,
    looksLikePostgresUri: isPostgres,
  };
}

/**
 * Diagnóstico sin secretos: solo indica si cada variable existe y no está vacía.
 * Útil en Vercel para comprobar que Production ve las variables correctas.
 */
export async function GET() {
  const checked: Record<string, boolean> = {};
  for (const k of ENV_KEYS) {
    checked[k] = !!process.env[k]?.trim();
  }

  const resolved = !!getSupabasePublicEnv();
  const hasHttpsApiUrl = !!getSupabasePublicUrl();
  const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  const urlHints = [
    urlEnvHint("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    urlEnvHint("PUBLIC_SUPABASE_URL", process.env.PUBLIC_SUPABASE_URL),
    urlEnvHint("SUPABASE_URL", process.env.SUPABASE_URL),
  ];

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    checked,
    resolved,
    /** true si hay URL https válida para la API (invitaciones por correo). */
    hasHttpsSupabaseApiUrl: hasHttpsApiUrl,
    /** true si existe la clave service_role (invitaciones por correo). */
    hasServiceRoleKey,
    /** Ambos hacen falta para inviteUserByEmail desde el servidor. */
    inviteByEmailReady: hasHttpsApiUrl && hasServiceRoleKey,
    supabaseUrlHints: urlHints,
  });
}
