"use client";

import { ProjectHierarchySelect, type ProjectHierarchySelectProps } from "@/app/dashboard/_components/project-hierarchy-select";

type DashboardScopeSelectProps = Omit<ProjectHierarchySelectProps, "className"> & {
  className?: string;
};

export function DashboardScopeSelect({
  className = "",
  "aria-label": ariaLabel = "Iniciativa o subproyecto",
  ...props
}: DashboardScopeSelectProps) {
  return (
    <div className={`relative min-w-[min(100%,13rem)] sm:min-w-[15rem] ${className}`}>
      <span
        className="pointer-events-none absolute inset-y-0 left-0 w-1 rounded-l-lg bg-slate-700"
        aria-hidden
      />
      <ProjectHierarchySelect
        {...props}
        aria-label={ariaLabel}
        className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3.5 pr-9 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200/80 transition hover:border-slate-400 hover:bg-slate-50 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
      />
    </div>
  );
}
