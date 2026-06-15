import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { MinuteDetailClient } from "@/app/dashboard/minutes/minute-detail-client";
import { MINUTES_HUB } from "@/lib/dashboard-paths";
import { getSessionUser } from "@/lib/auth/session";
import { canWriteWorkspaceData } from "@/lib/workspace-access";
import { getSessionProjectIdsFilter } from "@/lib/project-scope";
import { requireTenantId } from "@/lib/tenancy";
import { meetingMinuteTableMissingMessage } from "@/lib/prisma-errors";
import { dashAlertWarn, dashPage } from "@/lib/ui-classes";
import {
  getMeetingMinuteById,
  isMeetingMinuteStorageReady,
} from "@/modules/meeting-minutes/service";

export const dynamic = "force-dynamic";

type MinuteDetailPageProps = {
  params: Promise<{ minuteId: string }>;
};

export default async function MinuteDetailPage({ params }: MinuteDetailPageProps) {
  const { minuteId } = await params;
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const tenantId = await requireTenantId();
  const canEdit = canWriteWorkspaceData(session);

  const storageReady = await isMeetingMinuteStorageReady();
  if (!storageReady) {
    return (
      <main className={dashPage}>
        <p className={dashAlertWarn} role="status">
          {meetingMinuteTableMissingMessage()}
        </p>
        <Link href={MINUTES_HUB} className="mt-4 inline-block text-sm underline">
          Volver a minutas
        </Link>
      </main>
    );
  }

  const minute = await getMeetingMinuteById(tenantId, minuteId);
  if (!minute) notFound();

  const projectIdsFilter = await getSessionProjectIdsFilter(session, tenantId);
  if (
    projectIdsFilter !== undefined &&
    !projectIdsFilter.includes(minute.projectId)
  ) {
    notFound();
  }

  return (
    <main className={dashPage}>
      <MinuteDetailClient minute={minute} canEdit={canEdit} />
    </main>
  );
}
