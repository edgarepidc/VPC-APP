"use client";

import { useEffect, useState } from "react";

import { uiLabel } from "@/lib/ui-classes";
import type { RoleKey } from "@/lib/types";

export type ProjectOption = { id: string; name: string };

type Props = {
  projects: ProjectOption[];
  roleSelectName?: string;
  initialRole?: RoleKey;
  initialAllProjects?: boolean;
  initialProjectIds?: string[];
};

export function ManagerProjectScopeFields({
  projects,
  roleSelectName = "role",
  initialRole = "member",
  initialAllProjects = false,
  initialProjectIds = [],
}: Props) {
  const [role, setRole] = useState<RoleKey>(initialRole);
  const [allProjects, setAllProjects] = useState(initialAllProjects);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialProjectIds));

  useEffect(() => {
    const form = document.querySelector(`select[name="${roleSelectName}"]`);
    if (!form) return;
    const handler = () => setRole((form as HTMLSelectElement).value as RoleKey);
    form.addEventListener("change", handler);
    return () => form.removeEventListener("change", handler);
  }, [roleSelectName]);

  if (role !== "manager") return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-medium text-slate-900">Iniciativas del PM</p>
      <p className="mt-0.5 text-xs text-slate-600">
        Elige una o más iniciativas; el PM verá todos sus subproyectos.
      </p>

      <label className="mt-3 flex items-center gap-2 text-sm text-slate-800">
        <input
          type="checkbox"
          name="managerAllProjects"
          checked={allProjects}
          onChange={(e) => setAllProjects(e.target.checked)}
          className="rounded border-slate-300"
        />
        Todas las iniciativas de la organización
      </label>

      {!allProjects ? (
        <div className="mt-3">
          <span className={uiLabel}>Iniciativas asignadas</span>
          {projects.length === 0 ? (
            <p className="mt-1 text-xs text-amber-700">
              No hay iniciativas en esta organización. Crea iniciativas antes de asignar un PM.
            </p>
          ) : (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-white p-2">
              {projects.map((p) => (
                <li key={p.id}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      className="rounded border-slate-300"
                    />
                    {p.name}
                  </label>
                </li>
              ))}
            </ul>
          )}
          <input
            type="hidden"
            name="managerProjectIds"
            value={[...selected].join(",")}
          />
        </div>
      ) : (
        <input type="hidden" name="managerProjectIds" value="" />
      )}
    </div>
  );
}
