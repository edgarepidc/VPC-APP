"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { DashboardScopeSelect } from "@/app/dashboard/_components/dashboard-scope-select";
import type { ProjectHierarchyGroup } from "@/lib/project-hierarchy";

import { buildTasksQuery } from "./tasks-query";

type TasksHeaderControlsProps = {
  view: string;
  project: string;
  q: string;
  assignee: string;
  priority: string;
  status: string;
  month?: string;
  groups: ProjectHierarchyGroup[];
};

export function TasksHeaderControls({
  view,
  project: initialProject,
  q: initialQ,
  assignee: initialAssignee,
  priority: initialPriority,
  status: initialStatus,
  month,
  groups,
}: TasksHeaderControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [projectFilter, setProjectFilter] = useState(initialProject);
  const [query, setQuery] = useState(initialQ);

  const assignee = searchParams.get("assignee") ?? initialAssignee;
  const priority = searchParams.get("priority") ?? initialPriority;
  const status = searchParams.get("status") ?? initialStatus;

  function syncUrl(next: { project?: string; q?: string }) {
    const qs = buildTasksQuery({
      view,
      project: next.project ?? projectFilter,
      q: next.q ?? query,
      assignee,
      priority,
      status,
      month,
    });
    const target = qs ? `${pathname}?${qs}` : pathname;
    if (qs !== searchParams.toString()) {
      router.replace(target, { scroll: false });
    }
  }

  return (
    <>
      <input
        id="tasks-search-input"
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          syncUrl({ q: e.target.value });
        }}
        placeholder="Buscar tarea…"
        className="h-10 w-[min(100%,12rem)] rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:w-[13rem]"
      />
      <DashboardScopeSelect
        value={projectFilter}
        onChange={(value) => {
          setProjectFilter(value);
          syncUrl({ project: value });
        }}
        groups={groups}
        allLabel="Todas las iniciativas"
        aria-label="Filtrar por iniciativa o subproyecto"
      />
    </>
  );
}
