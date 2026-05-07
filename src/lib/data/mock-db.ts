import { Project, Task, Tenant } from "@/lib/types";

export const tenants: Tenant[] = [
  { id: "tnt-acme", slug: "acme", name: "Acme Corp" },
  { id: "tnt-embus", slug: "embus", name: "EMBUS" },
];

export const projects: Project[] = [
  {
    id: "prj-1",
    tenantId: "tnt-acme",
    name: "Portal de Clientes",
    description: "Implementacion inicial del portal B2B.",
    createdBy: "usr-1",
  },
  {
    id: "prj-2",
    tenantId: "tnt-embus",
    name: "Backoffice Operativo",
    description: "Tableros internos para operaciones.",
    createdBy: "usr-1",
  },
];

export const tasks: Task[] = [
  {
    id: "tsk-1",
    tenantId: "tnt-acme",
    projectId: "prj-1",
    title: "Definir flujo de aprobacion",
    status: "in_progress",
  },
  {
    id: "tsk-2",
    tenantId: "tnt-embus",
    projectId: "prj-2",
    title: "Armar backlog del sprint 1",
    status: "todo",
  },
];
