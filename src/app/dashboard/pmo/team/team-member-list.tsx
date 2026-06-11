import type { ProjectHierarchyGroup } from "@/lib/project-hierarchy";
import { personInitialsFromName, ROLE_LABELS } from "@/lib/role-labels";
import { uiButtonPrimary } from "@/lib/ui-classes";
import type { RoleKey } from "@/lib/types";
import { formatProjectScopeLabel } from "@/modules/memberships/project-access";

import { ManagerProjectScopeFields } from "./manager-project-scope-fields";

type MemberProject = { id: string; name: string };

type TeamMember = {
  id: string;
  managerAllProjects: boolean;
  managerReadOnly: boolean;
  user: { name: string | null; email: string };
  role: { key: string; name: string };
  projectAccess: { project: MemberProject }[];
};

type TeamMemberListProps = {
  members: TeamMember[];
  canManage: boolean;
  allOrgProjects: MemberProject[];
  scopeGroups: ProjectHierarchyGroup[];
  updateManagerScopeAction: (formData: FormData) => Promise<void>;
};

const ROLE_BADGE: Record<string, string> = {
  admin: "pmo-badge pmo-badge--red",
  manager: "pmo-badge pmo-badge--yellow",
  member: "pmo-badge pmo-badge--blue",
};

function ManagerScopeChips({
  managerAllProjects,
  projects,
}: {
  managerAllProjects: boolean;
  projects: MemberProject[];
}) {
  if (managerAllProjects) {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
        Todas las iniciativas
      </span>
    );
  }

  if (projects.length === 0) {
    return (
      <span className="inline-flex items-center rounded-full border border-dashed border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500">
        Sin iniciativas asignadas
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {projects.map((p) => (
        <span
          key={p.id}
          className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
        >
          <span className="truncate">{p.name}</span>
        </span>
      ))}
    </div>
  );
}

export function TeamMemberList({
  members,
  canManage,
  allOrgProjects,
  scopeGroups,
  updateManagerScopeAction,
}: TeamMemberListProps) {
  if (members.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">Sin miembros en este workspace.</p>
    );
  }

  return (
    <ul className="mt-3 space-y-3">
      {members.map((member) => {
        const roleKey = member.role.key as RoleKey;
        const assignedProjects = member.projectAccess.map((row) => row.project);
        const assignedIds = assignedProjects.map((p) => p.id);
        const initials = personInitialsFromName(member.user.name ?? "", member.user.email);
        const scopeLabel = formatProjectScopeLabel({
          roleKey,
          managerAllProjects: member.managerAllProjects,
          projects: assignedProjects,
        });

        return (
          <li
            key={member.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
          >
            <div className="flex flex-wrap items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white"
                aria-hidden
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">{member.user.name ?? "—"}</p>
                  <span className={ROLE_BADGE[roleKey] ?? "pmo-badge"}>
                    {ROLE_LABELS[roleKey] ?? member.role.name}
                  </span>
                  {member.managerReadOnly ? (
                    <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                      Solo lectura
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-sm text-slate-600">{member.user.email}</p>

                {roleKey === "manager" ? (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Alcance PM
                    </p>
                    <div className="mt-2">
                      <ManagerScopeChips
                        managerAllProjects={member.managerAllProjects}
                        projects={assignedProjects}
                      />
                    </div>
                    {canManage ? (
                      <details className="mt-3 text-sm">
                        <summary className="cursor-pointer text-xs font-medium text-slate-600 hover:text-slate-900">
                          Editar alcance · {scopeLabel}
                        </summary>
                        <form
                          action={updateManagerScopeAction}
                          className="mt-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3"
                        >
                          <input type="hidden" name="membershipId" value={member.id} />
                          <input type="hidden" name="role" value="manager" />
                          <ManagerProjectScopeFields
                            projects={allOrgProjects}
                            groups={scopeGroups}
                            initialRole="manager"
                            initialAllProjects={member.managerAllProjects}
                            initialReadOnly={member.managerReadOnly}
                            initialProjectIds={assignedIds}
                          />
                          <button
                            type="submit"
                            className={`mt-3 ${uiButtonPrimary.replace("w-full ", "w-auto !py-1.5 text-xs")}`}
                          >
                            Guardar proyectos
                          </button>
                        </form>
                      </details>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">Acceso completo al workspace</p>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
