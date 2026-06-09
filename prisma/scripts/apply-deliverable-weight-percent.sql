-- Idempotente: peso como % + flag weightManual
ALTER TABLE "Deliverable" ADD COLUMN IF NOT EXISTS "weightManual" BOOLEAN NOT NULL DEFAULT false;

INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
SELECT gen_random_uuid()::text, '', NOW(), '20260610120000_deliverable_weight_percent', NULL, NULL, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '20260610120000_deliverable_weight_percent');
