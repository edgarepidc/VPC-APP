-- Soporte documental: enlace externo y PDF adjunto
ALTER TABLE "Deliverable" ADD COLUMN "supportUrl" TEXT;
ALTER TABLE "Deliverable" ADD COLUMN "supportFileUrl" TEXT;
ALTER TABLE "Deliverable" ADD COLUMN "supportFileName" TEXT;
