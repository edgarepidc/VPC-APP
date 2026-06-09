-- Peso como % del avance del proyecto (1–100, suma 100 por proyecto)
ALTER TABLE "Deliverable" ADD COLUMN "weightManual" BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN "Deliverable"."weight" IS 'Porcentaje de participación en el avance del proyecto (1-100).';
