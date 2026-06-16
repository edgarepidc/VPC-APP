-- AlterTable
ALTER TABLE "Task" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE "Task" ADD COLUMN "checklist" JSONB NOT NULL DEFAULT '[]';
