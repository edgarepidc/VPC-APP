"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DashboardScopeSelect } from "@/app/dashboard/_components/dashboard-scope-select";
import type { ProjectHierarchyGroup } from "@/lib/project-hierarchy";

function buildTasksQuery(view: string, project: string, q: string, month?: string) {
  const sp = new URLSearchParams();
  sp.set("view", view);
  if (project.trim()) sp.set("project", project.trim());
  if (q.trim()) sp.set("q", q.trim());
  if (month && /^\d{4}-\d{2}$/.test(month)) sp.set("month", month);
  return sp.toString();
}

type TasksHeaderControlsProps = {
  view: string;
  project: string;
  q: string;
  month?: string;
  groups: ProjectHierarchyGroup[];
};

export function TasksHeaderControls({
  view,
  project: initialProject,
  q: initialQ,
  month,
  groups,
}: TasksHeaderControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [projectFilter, setProjectFilter] = useState(initialProject);
  const [query, setQuery] = useState(initialQ);

  useEffect(() => {
    setProjectFilter(initialProject);
    setQuery(initialQ);
  }, [initialProject, initialQ]);

  useEffect(() => {
    const qs = buildTasksQuery(view, projectFilter, query, month);
    const target = qs ? `${pathname}?${qs}` : pathname;
    if (qs !== searchParams.toString()) {
      router.replace(target, { scroll: false });
    }
  }, [projectFilter, query, view, month, pathname, router, searchParams]);

  return (
    <>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar tarea…"
        className="h-10 w-[min(100%,12rem)] rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100 sm:w-[13rem]"
      />
      <DashboardScopeSelect
        value={projectFilter}
        onChange={setProjectFilter}
        groups={groups}
        allLabel="Todas las iniciativas"
        aria-label="Filtrar por iniciativa o subproyecto"
      />
    </>
  );
}
