-- AlterTable
ALTER TABLE "Deliverable" ADD COLUMN IF NOT EXISTS "supportFiles" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Deliverable" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
ALTER TABLE "Deliverable" ADD COLUMN IF NOT EXISTS "dependsOnId" TEXT;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Deliverable_dependsOnId_fkey'
  ) THEN
    ALTER TABLE "Deliverable"
      ADD CONSTRAINT "Deliverable_dependsOnId_fkey"
      FOREIGN KEY ("dependsOnId") REFERENCES "Deliverable"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
