import {
  ESCALATION_INDICATOR_HELP,
  type EscalationIndicatorKey,
} from "@/lib/escalation-indicators";
import type { EscalationIndicators, EscalationTier } from "@/modules/escalations/service";

export type IndicatorLevel = "low" | "medium" | "high";

export type EscalationEvaluation = {
  tier: EscalationTier;
  title: string;
  levelLabel: string;
  actions: string[];
};

export const ESCALATION_LEVEL_OPTIONS: Record<
  EscalationIndicatorKey,
  { label: string; value: IndicatorLevel }[]
> = {
  budget: [
    { label: "0–5 % — Dentro del rango", value: "low" },
    { label: "5–15 % — Variación moderada", value: "medium" },
    { label: "> 15 % — Desviación crítica", value: "high" },
  ],
  schedule: [
    { label: "0–3 días — En plazo", value: "low" },
    { label: "4–7 días — Retraso manejable", value: "medium" },
    { label: "> 7 días — Retraso crítico", value: "high" },
  ],
  team: [
    { label: "Estable — Objetivos cumplidos", value: "low" },
    { label: "Inconsistente — Entregas variables", value: "medium" },
    { label: "> 2 semanas de incumplimiento", value: "high" },
  ],
  scope: [
    { label: "Alineado — Sin cambios", value: "low" },
    { label: "Variación menor — Controlada", value: "medium" },
    { label: "> 10 % del esfuerzo — Estructural", value: "high" },
  ],
  stakeholders: [
    { label: "Satisfechos — Sin fricciones", value: "low" },
    { label: "Duda razonable — En conversación", value: "medium" },
    { label: "Desalineados — Conflicto activo", value: "high" },
  ],
  impact: [
    { label: "Bajo — Operativo / local", value: "low" },
    { label: "Medio — Área o proceso clave", value: "medium" },
    { label: "Alto — Estratégico / regulatorio", value: "high" },
  ],
};

export const ESCALATION_INDICATOR_IDS = Object.keys(
  ESCALATION_INDICATOR_HELP,
) as EscalationIndicatorKey[];

function buildRedActions(values: EscalationIndicators): string[] {
  const actions = ["Notificar al Sponsor y PMO en las próximas 24 horas."];
  if (values.budget === "high") actions.push("Solicitar revisión presupuestal urgente con el CFO.");
  if (values.schedule === "high")
    actions.push("Activar plan de recuperación de cronograma (fast-tracking / crashing).");
  if (values.team === "high") actions.push("Escalar a RRHH: intervención de desempeño del equipo.");
  if (values.scope === "high")
    actions.push("Emitir Change Request formal y congelar cambios adicionales.");
  if (values.stakeholders === "high")
    actions.push("Agendar sesión ejecutiva de alineación con stakeholders clave.");
  if (values.impact === "high")
    actions.push("Evaluar impacto regulatorio/estratégico con la Alta Dirección.");
  actions.push("Actualizar el registro de riesgos y crear plan de contingencia documentado.");
  return actions;
}

function buildOrangeActions(values: EscalationIndicators): string[] {
  const mediums = ESCALATION_INDICATOR_IDS.filter((id) => values[id] === "medium").map(
    (id) => ESCALATION_INDICATOR_HELP[id].label,
  );
  return [
    mediums.length > 0
      ? `Áreas con variación moderada: ${mediums.join(", ")}.`
      : "Varias áreas en nivel moderado.",
    "Programar revisión extraordinaria con el PMO esta semana.",
    "Documentar causas raíz de las desviaciones identificadas.",
    "Agendar sesión 1:1 con los responsables de cada área en amarillo.",
    "Actualizar el semáforo de estado del proyecto en el dashboard.",
  ];
}

export function evaluateEscalation(values: EscalationIndicators): EscalationEvaluation {
  const levels = Object.values(values);
  const countHigh = levels.filter((l) => l === "high").length;
  const countMedium = levels.filter((l) => l === "medium").length;

  if (countHigh >= 1) {
    return {
      tier: "red",
      title: "Escalamiento Inmediato Requerido",
      levelLabel: "NIVEL ROJO",
      actions: buildRedActions(values),
    };
  }

  if (countMedium >= 2) {
    return {
      tier: "orange",
      title: "Revisión de PMO Recomendada",
      levelLabel: "NIVEL NARANJA",
      actions: buildOrangeActions(values),
    };
  }

  return {
    tier: "green",
    title: "Proyecto en Monitoreo Normal",
    levelLabel: "NIVEL VERDE",
    actions: [
      "Mantener el ritmo de seguimiento semanal.",
      "Documentar avances y lecciones aprendidas.",
      "Validar el estado con el equipo en la próxima daily/standup.",
    ],
  };
}
