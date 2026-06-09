-- Idempotente: aplicar en Supabase SQL Editor si migrate deploy no corrió.
-- ROI de reuniones — tabla MeetingRoiSession

CREATE TABLE IF NOT EXISTS "MeetingRoiSession" (
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

CREATE INDEX IF NOT EXISTS "MeetingRoiSession_tenantId_projectId_createdAt_idx"
  ON "MeetingRoiSession"("tenantId", "projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "MeetingRoiSession_tenantId_createdAt_idx"
  ON "MeetingRoiSession"("tenantId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MeetingRoiSession_tenantId_fkey') THEN
    ALTER TABLE "MeetingRoiSession" ADD CONSTRAINT "MeetingRoiSession_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MeetingRoiSession_projectId_fkey') THEN
    ALTER TABLE "MeetingRoiSession" ADD CONSTRAINT "MeetingRoiSession_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
SELECT gen_random_uuid()::text, '', NOW(), '20260609200000_meeting_roi_sessions', NULL, NULL, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '20260609200000_meeting_roi_sessions');
