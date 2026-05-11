import { createBrowserClient } from "@supabase/ssr";

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return { supabaseUrl, supabaseKey };
}

export function createClient() {
  const { supabaseUrl, supabaseKey } = getEnv();
  if (!supabaseUrl?.trim() || !supabaseKey?.trim()) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en el entorno del build.",
    );
  }
  return createBrowserClient(supabaseUrl, supabaseKey);
}
