import type { EscalationDetailRecord } from "@/app/dashboard/pmo/escalation-detail-dialog";
import { getIndicatorLabel, getIndicatorLevelLabel } from "@/lib/escalation-indicators";
import {
  ESCALATION_INDICATOR_KEYS,
  formatEscalationDateTime,
  getEscalationTierBadge,
} from "@/lib/escalation-utils";

function csvCell(value: string) {
  const v = value.replace(/"/g, '""');
  return `"${v}"`;
}

export function exportEscalationHistoryCsv(rows: EscalationDetailRecord[]) {
  const exportedAt = new Date().toISOString().slice(0, 10);
  const indicatorHeaders = ESCALATION_INDICATOR_KEYS.flatMap((key) => [
    getIndicatorLabel(key),
  ]);

  const header = [
    "ID",
    "Subproyecto",
    "Tema",
    "Nivel",
    "Semáforo",
    "Título",
    ...indicatorHeaders,
    "Acciones recomendadas",
    "Autor",
    "Fecha evaluación",
    "Fecha exportación",
  ];

  const lines = [
    header.join(","),
    ...rows.map((row) => {
      const badge = getEscalationTierBadge(row.tier);
      const indicatorValues = ESCALATION_INDICATOR_KEYS.map((key) =>
        csvCell(getIndicatorLevelLabel(row.indicators[key] ?? "low")),
      );
      return [
        csvCell(row.id),
        csvCell(row.project.name),
        csvCell(row.topic ?? ""),
        csvCell(row.levelLabel),
        csvCell(badge.label),
        csvCell(row.title),
        ...indicatorValues,
        csvCell(row.actions.join(" | ")),
        csvCell(row.authorName),
        csvCell(formatEscalationDateTime(new Date(row.createdAt))),
        csvCell(exportedAt),
      ].join(",");
    }),
  ];

  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `historial-escalamientos-${exportedAt}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
