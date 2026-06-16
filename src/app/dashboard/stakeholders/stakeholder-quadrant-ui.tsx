import type { QuadrantId } from "@/lib/stakeholder-playbook";
import {
  QUADRANT_PLAYBOOK,
  formatQuadrantTacticsForExport,
  getQuadrantId,
  quadrantLabelFull,
} from "@/lib/stakeholder-playbook";

import type { MatrixStakeholder } from "./stakeholder-matrix-client";

export const QUADRANT_FILTER_OPTIONS: { id: QuadrantId; label: string }[] = [
  { id: "q1", label: "Q1 · Promotores" },
  { id: "q2", label: "Q2 · Latentes" },
  { id: "q3", label: "Q3 · Defensores" },
  { id: "q4", label: "Q4 · Espectadores" },
];

export const QUADRANT_BADGE_CLASS: Record<QuadrantId, string> = {
  q1: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  q2: "bg-amber-50 text-amber-900 ring-amber-200",
  q3: "bg-sky-50 text-sky-900 ring-sky-200",
  q4: "bg-slate-100 text-slate-700 ring-slate-200",
};

export function stakeholderQuadrantId(s: Pick<MatrixStakeholder, "influence" | "interest">) {
  return getQuadrantId(s.influence, s.interest);
}

export function StakeholderQuadrantBadge({
  influence,
  interest,
}: {
  influence: number;
  interest: number;
}) {
  const id = getQuadrantId(influence, interest);
  const pb = QUADRANT_PLAYBOOK[id];
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${QUADRANT_BADGE_CLASS[id]}`}
    >
      {pb.shortLabel}
    </span>
  );
}

function csvCell(value: string) {
  const v = value.replace(/"/g, '""');
  return `"${v}"`;
}

export function exportStakeholdersCsv(rows: MatrixStakeholder[]) {
  const exportedAt = new Date().toISOString().slice(0, 10);
  const header = [
    "ID",
    "Nombre",
    "Rol",
    "Subproyecto",
    "Influencia",
    "Interés",
    "Código cuadrante",
    "Perfil",
    "Cuadrante",
    "Posición en matriz",
    "Estrategia",
    "Fundamento estrategia",
    "Frecuencia comunicación",
    "Tácticas",
    "Observación",
    "Fecha exportación",
  ];
  const lines = [
    header.join(","),
    ...rows.map((s) => {
      const pb = QUADRANT_PLAYBOOK[getQuadrantId(s.influence, s.interest)];
      return [
        csvCell(s.id),
        csvCell(s.name),
        csvCell(s.role ?? ""),
        csvCell(s.projectName),
        String(s.influence),
        String(s.interest),
        csvCell(pb.code),
        csvCell(pb.shortLabel),
        csvCell(pb.fullLabel),
        csvCell(pb.positionHint),
        csvCell(pb.strategy),
        csvCell(pb.strategyRationale),
        csvCell(pb.freq),
        csvCell(formatQuadrantTacticsForExport(pb.tactics)),
        csvCell(s.observation ?? ""),
        csvCell(exportedAt),
      ].join(",");
    }),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `registro-interesados-${exportedAt}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function quadrantLabelForStakeholder(s: MatrixStakeholder) {
  return quadrantLabelFull(s.influence, s.interest);
}
