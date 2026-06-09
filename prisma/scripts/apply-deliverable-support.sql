-- Idempotente: soporte documental en entregables
ALTER TABLE "Deliverable" ADD COLUMN IF NOT EXISTS "supportUrl" TEXT;
ALTER TABLE "Deliverable" ADD COLUMN IF NOT EXISTS "supportFileUrl" TEXT;
ALTER TABLE "Deliverable" ADD COLUMN IF NOT EXISTS "supportFileName" TEXT;

INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
SELECT gen_random_uuid()::text, '', NOW(), '20260610140000_deliverable_support', NULL, NULL, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '20260610140000_deliverable_support');
