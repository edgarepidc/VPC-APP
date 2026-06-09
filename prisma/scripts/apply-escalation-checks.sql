-- Idempotente: aplicar en Supabase SQL Editor si migrate deploy no corrió.
-- Escalómetro — tabla EscalationCheck

CREATE TABLE IF NOT EXISTS "EscalationCheck" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "topic" TEXT,
    "tier" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "levelLabel" TEXT NOT NULL,
    "indicators" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EscalationCheck_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EscalationCheck_tenantId_projectId_createdAt_idx"
  ON "EscalationCheck"("tenantId", "projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "EscalationCheck_tenantId_createdAt_idx"
  ON "EscalationCheck"("tenantId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EscalationCheck_tenantId_fkey') THEN
    ALTER TABLE "EscalationCheck" ADD CONSTRAINT "EscalationCheck_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EscalationCheck_projectId_fkey') THEN
    ALTER TABLE "EscalationCheck" ADD CONSTRAINT "EscalationCheck_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
SELECT gen_random_uuid()::text, '', NOW(), '20260609190000_escalation_checks', NULL, NULL, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '20260609190000_escalation_checks');
