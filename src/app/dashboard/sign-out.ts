"use server";

import { redirect } from "next/navigation";

import { clearActiveTenant } from "@/lib/auth/session";
import { getSupabasePublicEnv } from "@/utils/supabase/env";
import { createClient } from "@/utils/supabase/server";

export async function signOutAction() {
  if (!getSupabasePublicEnv()) {
    await clearActiveTenant();
    redirect("/login");
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  await clearActiveTenant();
  redirect("/login");
}
