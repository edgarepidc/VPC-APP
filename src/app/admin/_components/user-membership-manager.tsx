"use client";

import { useState } from "react";

import { adminActionBtnDanger, adminActionBtnSecondary, uiInput } from "@/lib/ui-classes";
import { ROLE_LABELS } from "@/lib/role-labels";
import type { RoleKey } from "@/lib/types";

import {
  addMembershipAction,
  changeMembershipRoleAction,
  removeMembershipAction,
} from "../users/actions";

import { AdminManagerProjectScopeFields } from "./manager-project-scope-fields";

type Membership = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  roleKey: string;
  managerAllProjects: boolean;
  projectIds: string[];
};

type TenantOption = { id: string; name: string; slug: string };
type ProjectOption = { id: string; name: string };

type Props = {
  userId: string;
  memberships: Membership[];
  tenants: TenantOption[];
  projectsByTenant: Record<string, ProjectOption[]>;
  filterQ: string;
  filterTenant: string;
};

const ROLE_KEYS = Object.keys(ROLE_LABELS) as RoleKey[];

export function UserMembershipManager({
  userId,
  memberships,
  tenants,
  projectsByTenant,
  filterQ,
  filterTenant,
}: Props) {
  const [open, setOpen] = useState(false);

  const assignedIds = new Set(memberships.map((m) => m.tenantId));
  const availableTenants = tenants.filter((t) => !assignedIds.has(t.id));

  return (
    <div className="min-w-[12rem]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${adminActionBtnSecondary} w-full`}
      >
        {open ? "Cerrar orgs" : "Gestionar orgs"}
      </button>

      {open ? (
        <div className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
          {memberships.length === 0 ? (
            <p className="text-xs text-slate-500">Sin organizaciones.</p>
          ) : (
            memberships.map((m) => (
              <div
                key={m.tenantId}
                className="rounded-md border border-slate-200 bg-white p-2 text-xs"
              >
                <p className="font-medium text-slate-900">{m.tenantName}</p>
                <p className="text-slate-500">{m.tenantSlug}</p>
                <form action={changeMembershipRoleAction} className="mt-2 space-y-2">
                  <input type="hidden" name="userId" value={userId} />
                  <input type="hidden" name="tenantId" value={m.tenantId} />
                  <input type="hidden" name="filterQ" value={filterQ} />
                  <input type="hidden" name="filterTenant" value={filterTenant} />
                  <div className="flex flex-wrap gap-1">
                    <select
                      name="roleKey"
                      defaultValue={m.roleKey}
                      className={`${uiInput} !py-1 !text-xs max-w-[8rem]`}
                    >
                      {ROLE_KEYS.map((key) => (
                        <option key={key} value={key}>
                          {ROLE_LABELS[key]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className={adminActionBtnSecondary.replace("min-w-[5.25rem]", "min-w-0 px-2")}
                    >
                      Guardar rol e iniciativas
                    </button>
                  </div>
                  <AdminManagerProjectScopeFields
                    tenantId={m.tenantId}
                    projectsByTenant={projectsByTenant}
                    roleSelectName="roleKey"
                    tenantSelectName="tenantId"
                    initialRole={m.roleKey as RoleKey}
                    initialAllProjects={m.managerAllProjects}
                    initialProjectIds={m.projectIds}
                  />
                </form>
                <form action={removeMembershipAction} className="mt-1">
                  <input type="hidden" name="userId" value={userId} />
                  <input type="hidden" name="tenantId" value={m.tenantId} />
                  <input type="hidden" name="filterQ" value={filterQ} />
                  <input type="hidden" name="filterTenant" value={filterTenant} />
                  <button type="submit" className={adminActionBtnDanger.replace("min-w-[5.25rem]", "min-w-0 px-2")}>
                    Quitar
                  </button>
                </form>
              </div>
            ))
          )}

          {availableTenants.length > 0 ? (
            <form action={addMembershipAction} className="space-y-1 border-t border-slate-200 pt-2">
              <input type="hidden" name="userId" value={userId} />
              <input type="hidden" name="filterQ" value={filterQ} />
              <input type="hidden" name="filterTenant" value={filterTenant} />
              <p className="text-[11px] font-medium text-slate-700">Agregar organización</p>
              <select name="tenantId" required className={`${uiInput} !py-1 !text-xs`}>
                <option value="">Seleccionar…</option>
                {availableTenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <select name="roleKey" defaultValue="member" className={`${uiInput} !py-1 !text-xs`}>
                {ROLE_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {ROLE_LABELS[key]}
                  </option>
                ))}
              </select>
              <AdminManagerProjectScopeFields
                tenantId={availableTenants[0]?.id ?? ""}
                projectsByTenant={projectsByTenant}
                roleSelectName="roleKey"
                tenantSelectName="tenantId"
              />
              <button type="submit" className={`${adminActionBtnSecondary} w-full`}>
                Asignar
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
