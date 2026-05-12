-- Tracker de entregables: campos alineados con gestión de alcance / acuses
ALTER TABLE "Deliverable" ADD COLUMN "clientName" TEXT;
ALTER TABLE "Deliverable" ADD COLUMN "description" TEXT;
ALTER TABLE "Deliverable" ADD COLUMN "acceptanceCriteria" TEXT;
ALTER TABLE "Deliverable" ADD COLUMN "acuses" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Deliverable" ADD COLUMN "activityLog" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Deliverable" ALTER COLUMN "weight" SET DEFAULT 5;
