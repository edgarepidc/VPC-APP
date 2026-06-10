"use client";

import { useEffect, useState } from "react";

import { uiLabel } from "@/lib/ui-classes";
import type { RoleKey } from "@/lib/types";

export type ProjectOption = { id: string; name: string };

type Props = {
  tenantId: string;
  projectsByTenant: Record<string, ProjectOption[]>;
  roleSelectName?: string;
  tenantSelectName?: string;
  initialRole?: RoleKey;
  initialAllProjects?: boolean;
  initialProjectIds?: string[];
};

export function AdminManagerProjectScopeFields({
  tenantId,
  projectsByTenant,
  roleSelectName = "roleKey",
  tenantSelectName = "tenantId",
  initialRole = "member",
  initialAllProjects = false,
  initialProjectIds = [],
}: Props) {
  const [role, setRole] = useState<RoleKey>(initialRole);
  const [activeTenantId, setActiveTenantId] = useState(tenantId);
  const [allProjects, setAllProjects] = useState(initialAllProjects);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialProjectIds));

  useEffect(() => {
    const roleEl = document.querySelector(`select[name="${roleSelectName}"]`);
    const tenantEl = document.querySelector(`select[name="${tenantSelectName}"]`);
    const onRole = () => {
      if (roleEl) setRole((roleEl as HTMLSelectElement).value as RoleKey);
    };
    const onTenant = () => {
      if (tenantEl) setActiveTenantId((tenantEl as HTMLSelectElement).value);
    };
    roleEl?.addEventListener("change", onRole);
    tenantEl?.addEventListener("change", onTenant);
    return () => {
      roleEl?.removeEventListener("change", onRole);
      tenantEl?.removeEventListener("change", onTenant);
    };
  }, [roleSelectName, tenantSelectName]);

  if (role !== "manager") return null;

  const projects = projectsByTenant[activeTenantId] ?? [];

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
      <p className="text-sm font-medium text-slate-900">Iniciativas del PM</p>
      <label className="mt-2 flex items-center gap-2 text-sm text-slate-800">
        <input
          type="checkbox"
          name="managerAllProjects"
          checked={allProjects}
          onChange={(e) => setAllProjects(e.target.checked)}
          className="rounded border-slate-300"
        />
        Todas las iniciativas
      </label>
      {!allProjects ? (
        <div className="mt-2">
          <span className={uiLabel}>Iniciativas</span>
          {projects.length === 0 ? (
            <p className="mt-1 text-xs text-amber-700">Sin iniciativas en esta org.</p>
          ) : (
            <ul className="mt-1 max-h-32 space-y-1 overflow-y-auto rounded border border-slate-200 bg-white p-2 text-xs">
              {projects.map((p) => (
                <li key={p.id}>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                    />
                    {p.name}
                  </label>
                </li>
              ))}
            </ul>
          )}
          <input type="hidden" name="managerProjectIds" value={[...selected].join(",")} />
        </div>
      ) : (
        <input type="hidden" name="managerProjectIds" value="" />
      )}
    </div>
  );
}
