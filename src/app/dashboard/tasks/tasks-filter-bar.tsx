"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import {
  TASK_KANBAN_STATUSES,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  type TaskKanbanStatus,
} from "@/modules/tasks/constants";
import type { TaskLabelRecord } from "@/modules/tasks/labels";

import type { TaskMemberOption } from "./task-edit-dialog";
import { buildTasksQuery, type TasksFilterParams } from "./tasks-query";

const selectClass =
  "h-9 min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100";

type Props = {
  view: string;
  project: string;
  q: string;
  assignee: string;
  priority: string;
  status: string;
  label: string;
  month?: string;
  members: TaskMemberOption[];
  labelCatalog: TaskLabelRecord[];
};

export function TasksFilterBar({
  view,
  project,
  q,
  assignee: initialAssignee,
  priority: initialPriority,
  status: initialStatus,
  label: initialLabel,
  month,
  members,
  labelCatalog,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const assignee = searchParams.get("assignee") ?? initialAssignee;
  const priority = searchParams.get("priority") ?? initialPriority;
  const status = searchParams.get("status") ?? initialStatus;
  const label = searchParams.get("label") ?? initialLabel;

  const hasActiveFilters = Boolean(assignee || priority || status || label);

  const memberLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const row of members) {
      m.set(row.id, row.name?.trim() || row.email.split("@")[0] || row.email);
    }
    return m;
  }, [members]);

  function pushFilters(next: Partial<TasksFilterParams>) {
    const qs = buildTasksQuery({
      view,
      project,
      q,
      assignee: next.assignee ?? assignee,
      priority: next.priority ?? priority,
      status: next.status ?? status,
      label: next.label ?? label,
      month,
    });
    const target = qs ? `${pathname}?${qs}` : pathname;
    if (qs !== searchParams.toString()) {
      router.replace(target, { scroll: false });
    }
  }

  function clearFilters() {
    pushFilters({ assignee: "", priority: "", status: "", label: "" });
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Filtrar
      </span>
      <select
        value={assignee}
        onChange={(e) => pushFilters({ assignee: e.target.value })}
        className={selectClass}
        aria-label="Filtrar por responsable"
      >
        <option value="">Todas las personas</option>
        <option value="me">Asignadas a mí</option>
        <option value="none">Sin asignar</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {memberLabelById.get(m.id)}
          </option>
        ))}
      </select>
      <select
        value={label}
        onChange={(e) => pushFilters({ label: e.target.value })}
        className={selectClass}
        aria-label="Filtrar por etiqueta"
      >
        <option value="">Todas las etiquetas</option>
        {labelCatalog.map((row) => (
          <option key={row.id} value={row.id}>
            {row.name}
          </option>
        ))}
      </select>
      <select
        value={priority}
        onChange={(e) => pushFilters({ priority: e.target.value })}
        className={selectClass}
        aria-label="Filtrar por prioridad"
      >
        <option value="">Todas las prioridades</option>
        {TASK_PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {TASK_PRIORITY_LABEL[p]}
          </option>
        ))}
      </select>
      <select
        value={status}
        onChange={(e) => pushFilters({ status: e.target.value })}
        className={selectClass}
        aria-label="Filtrar por estado"
      >
        <option value="">Todos los estados</option>
        {TASK_KANBAN_STATUSES.map((st) => (
          <option key={st} value={st}>
            {TASK_STATUS_LABEL[st as TaskKanbanStatus]}
          </option>
        ))}
      </select>
      {hasActiveFilters ? (
        <button
          type="button"
          onClick={clearFilters}
          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Limpiar filtros
        </button>
      ) : null}
      {assignee === "me" ? (
        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-800 ring-1 ring-sky-200">
          Vista personal
        </span>
      ) : null}
    </div>
  );
}
