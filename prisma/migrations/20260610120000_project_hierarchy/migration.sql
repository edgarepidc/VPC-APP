-- Iniciativa (raíz) + subproyectos (hijos) en la misma tabla Project.

ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "parentProjectId" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Project_parentProjectId_fkey'
  ) THEN
    ALTER TABLE "Project"
      ADD CONSTRAINT "Project_parentProjectId_fkey"
      FOREIGN KEY ("parentProjectId") REFERENCES "Project"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Project_tenantId_parentProjectId_idx"
  ON "Project"("tenantId", "parentProjectId");
