"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { updatePlatformUserProfile } from "@/modules/platform-users/service";

export async function updateSelfProfileAction(formData: FormData) {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  try {
    await updatePlatformUserProfile({
      userId: session.userId,
      name: name || undefined,
      phone: phone || undefined,
      actorUserId: session.userId,
    });
    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/settings");
    redirect("/dashboard/settings?ok=Perfil+actualizado");
  } catch (e) {
    redirect(
      `/dashboard/settings?error=${encodeURIComponent((e as Error).message)}`,
    );
  }
}
