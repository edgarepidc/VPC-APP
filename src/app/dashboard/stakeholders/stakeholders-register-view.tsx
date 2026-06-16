"use client";

import type { MatrixStakeholder } from "./stakeholder-matrix-client";
import { StakeholderDetailPanel } from "./stakeholder-detail-panel";
import { StakeholderQuadrantBadge, exportStakeholdersCsv } from "./stakeholder-quadrant-ui";

type Props = {
  stakeholders: MatrixStakeholder[];
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  canEdit: boolean;
  onEdit: (s: MatrixStakeholder) => void;
  onDelete: (s: MatrixStakeholder) => void;
};

export function StakeholdersRegisterView({
  stakeholders,
  selectedId,
  onSelectId,
  canEdit,
  onEdit,
  onDelete,
}: Props) {
  const selected = stakeholders.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="flex min-h-[min(520px,70vh)] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm text-slate-600">
            <strong className="text-slate-900">{stakeholders.length}</strong> interesados en el
            alcance
          </p>
          <button
            type="button"
            onClick={() => exportStakeholdersCsv(stakeholders)}
            disabled={stakeholders.length === 0}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Exportar CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="pmo-table pmo-row-hover w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th>Nombre</th>
                <th>Rol</th>
                <th>Proyecto</th>
                <th>Cuadrante</th>
                <th className="text-center">Influencia</th>
                <th className="text-center">Interés</th>
                <th>Observación</th>
              </tr>
            </thead>
            <tbody>
              {stakeholders.map((s) => (
                <tr
                  key={s.id}
                  className={`cursor-pointer ${selectedId === s.id ? "bg-slate-100" : ""}`}
                  onClick={() => onSelectId(selectedId === s.id ? null : s.id)}
                >
                  <td className="font-medium text-slate-900">{s.name}</td>
                  <td className="text-slate-600">{s.role || "—"}</td>
                  <td className="text-slate-600">{s.projectName}</td>
                  <td>
                    <StakeholderQuadrantBadge influence={s.influence} interest={s.interest} />
                  </td>
                  <td className="text-center tabular-nums text-slate-700">{s.influence}</td>
                  <td className="text-center tabular-nums text-slate-700">{s.interest}</td>
                  <td className="max-w-[200px] truncate text-slate-500">{s.observation || "—"}</td>
                </tr>
              ))}
              {stakeholders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Sin interesados con los filtros actuales.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      <StakeholderDetailPanel
        selected={selected}
        canEdit={canEdit}
        onEdit={onEdit}
        onDelete={onDelete}
        className="border-t lg:border-t-0"
      />
    </div>
  );
}
