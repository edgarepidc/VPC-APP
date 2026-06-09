-- Evaluaciones del Escalómetro (registro ligero por proyecto)
CREATE TABLE "EscalationCheck" (
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

CREATE INDEX "EscalationCheck_tenantId_projectId_createdAt_idx" ON "EscalationCheck"("tenantId", "projectId", "createdAt");
CREATE INDEX "EscalationCheck_tenantId_createdAt_idx" ON "EscalationCheck"("tenantId", "createdAt");

ALTER TABLE "EscalationCheck" ADD CONSTRAINT "EscalationCheck_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EscalationCheck" ADD CONSTRAINT "EscalationCheck_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
