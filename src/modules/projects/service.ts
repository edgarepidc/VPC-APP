import { projects } from "@/lib/data/mock-db";

export function listProjectsByTenant(tenantId: string) {
  return projects.filter((project) => project.tenantId === tenantId);
}

export function createProject(input: {
  tenantId: string;
  name: string;
  description: string;
  createdBy: string;
}) {
  const project = {
    id: `prj-${projects.length + 1}`,
    ...input,
  };

  projects.push(project);
  return project;
}
