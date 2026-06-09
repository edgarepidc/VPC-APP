-- Sesiones ROI de reuniones (registro ligero por proyecto)
CREATE TABLE "MeetingRoiSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sessionName" TEXT,
    "objective" TEXT NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "costLevel" TEXT NOT NULL,
    "costPerMinute" DOUBLE PRECISION NOT NULL,
    "totalParticipants" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "diagnosisTitle" TEXT NOT NULL,
    "diagnosisText" TEXT NOT NULL,
    "participants" JSONB NOT NULL,
    "roleCosts" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingRoiSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MeetingRoiSession_tenantId_projectId_createdAt_idx" ON "MeetingRoiSession"("tenantId", "projectId", "createdAt");
CREATE INDEX "MeetingRoiSession_tenantId_createdAt_idx" ON "MeetingRoiSession"("tenantId", "createdAt");

ALTER TABLE "MeetingRoiSession" ADD CONSTRAINT "MeetingRoiSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingRoiSession" ADD CONSTRAINT "MeetingRoiSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
