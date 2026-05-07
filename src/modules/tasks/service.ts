import { tasks } from "@/lib/data/mock-db";

export function listTasksByTenant(tenantId: string) {
  return tasks.filter((task) => task.tenantId === tenantId);
}

export function createTask(input: {
  tenantId: string;
  projectId: string;
  title: string;
}) {
  const task = {
    id: `tsk-${tasks.length + 1}`,
    tenantId: input.tenantId,
    projectId: input.projectId,
    title: input.title,
    status: "todo" as const,
  };

  tasks.push(task);
  return task;
}
