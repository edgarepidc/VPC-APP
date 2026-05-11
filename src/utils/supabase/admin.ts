import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicUrl } from "@/utils/supabase/env";

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function createAdminClient() {
  const supabaseUrl = getSupabasePublicUrl();
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_URL no configuradas.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
