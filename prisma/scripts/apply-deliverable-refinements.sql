ALTER TABLE "Deliverable" ADD COLUMN IF NOT EXISTS "supportFiles" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Deliverable" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
ALTER TABLE "Deliverable" ADD COLUMN IF NOT EXISTS "dependsOnId" TEXT;

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

-- Migrar PDF legacy al arreglo JSON
UPDATE "Deliverable"
SET "supportFiles" = jsonb_build_array(
  jsonb_build_object(
    'url', "supportFileUrl",
    'name', COALESCE("supportFileName", 'soporte.pdf'),
    'uploadedAt', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  )
)
WHERE "supportFileUrl" IS NOT NULL
  AND ("supportFiles" IS NULL OR "supportFiles" = '[]'::jsonb);

-- deliveredAt para entregables ya cerrados
UPDATE "Deliverable"
SET "deliveredAt" = COALESCE("updatedAt", NOW())
WHERE "deliveredAt" IS NULL
  AND "status" IN ('approved', 'delivered');
