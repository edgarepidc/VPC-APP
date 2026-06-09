-- Acceso de PM (manager) a proyectos específicos o a todos.

ALTER TABLE "Membership" ADD COLUMN "managerAllProjects" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "MembershipProject" (
    "membershipId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "MembershipProject_pkey" PRIMARY KEY ("membershipId","projectId")
);

CREATE INDEX "MembershipProject_projectId_idx" ON "MembershipProject"("projectId");

ALTER TABLE "MembershipProject" ADD CONSTRAINT "MembershipProject_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MembershipProject" ADD CONSTRAINT "MembershipProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invitation" ADD COLUMN "managerAllProjects" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "InvitationProject" (
    "invitationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "InvitationProject_pkey" PRIMARY KEY ("invitationId","projectId")
);

ALTER TABLE "InvitationProject" ADD CONSTRAINT "InvitationProject_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvitationProject" ADD CONSTRAINT "InvitationProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
