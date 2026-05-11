import { NextResponse } from "next/server";

import { getSupabasePublicEnv } from "@/utils/supabase/env";

export const dynamic = "force-dynamic";

const ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
] as const;

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

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    checked,
    resolved,
  });
}
