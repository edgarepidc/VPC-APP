import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { TENANT_COOKIE } from "@/lib/tenant-cookie";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const tenantId = cookieStore.get(TENANT_COOKIE)?.value;
  if (!tenantId) redirect("/select-tenant");

  redirect("/dashboard/pmo");
}
