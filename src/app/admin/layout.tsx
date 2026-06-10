import { redirect } from "next/navigation";

import { dashShell } from "@/lib/ui-classes";
import { requirePlatformSuperAdmin } from "@/lib/auth/platform-admin";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { personInitialsFromName } from "@/lib/role-labels";

import { AdminChrome } from "./admin-chrome";

export const dynamic = "force-dynamic";

function displayPersonName(name: string, email: string): string {
  const n = name?.trim();
  if (n && n !== email) return n;
  return email;
}

function formatTodayEs(): string {
  const raw = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requirePlatformSuperAdmin();
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true, avatarUrl: true },
  });

  const personDisplayName = displayPersonName(
    user?.name ?? session.name,
    session.email,
  );
  const personInitials = personInitialsFromName(
    user?.name ?? session.name,
    session.email,
  );

  return (
    <div className={dashShell}>
      <AdminChrome
        personDisplayName={personDisplayName}
        personInitials={personInitials}
        personAvatarUrl={user?.avatarUrl ?? null}
        dateLabel={formatTodayEs()}
      >
        {children}
      </AdminChrome>
    </div>
  );
}
