-- PM: modo solo lectura y alcance granular por subproyecto (ids en MembershipProject).
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "managerReadOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "managerReadOnly" BOOLEAN NOT NULL DEFAULT false;
