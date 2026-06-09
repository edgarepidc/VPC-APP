/** Textos de ayuda alineados con dominios PMP (PMBOK). */

export type EscalationIndicatorKey =
  | "budget"
  | "schedule"
  | "team"
  | "scope"
  | "stakeholders"
  | "impact";

export type EscalationIndicatorHelp = {
  label: string;
  short: string;
  pmpDomain: string;
  summary: string;
  evaluate: string;
};

export const ESCALATION_INDICATOR_HELP: Record<EscalationIndicatorKey, EscalationIndicatorHelp> =
  {
    budget: {
      label: "Desviación de presupuesto",
      short: "P$",
      pmpDomain: "Gestión de costos · EVM",
      summary:
        "Compara el costo real (AC) con el valor planificado (PV) y el valor ganado (EV). Una desviación sostenida indica que el proyecto consume más recursos de los aprobados.",
      evaluate:
        "Revisa CPI (EV/AC) y la proyección EAC. >15 % suele requerir revisión con finanzas y replanificación del baseline.",
    },
    schedule: {
      label: "Retraso en cronograma",
      short: "CR",
      pmpDomain: "Gestión del cronograma",
      summary:
        "Mide el desfase entre fechas planificadas y reales en hitos o ruta crítica. El SPI (EV/PV) resume si el avance físico acompaña el calendario.",
      evaluate:
        "Identifica actividades en ruta crítica con holgura agotada. Retrasos >7 días en hitos clave activan planes de recuperación (fast-track, crashing).",
    },
    team: {
      label: "Desempeño del equipo",
      short: "EQ",
      pmpDomain: "Gestión de recursos",
      summary:
        "Evalúa capacidad, cumplimiento de compromisos y calidad de entregas del equipo asignado. Incluye disponibilidad, skills y dinámica de trabajo.",
      evaluate:
        "Dos semanas consecutivas sin cumplir objetivos del sprint/hito sugiere intervención del PM, RRHH o reasignación según la matriz RACI.",
    },
    scope: {
      label: "Deriva de alcance",
      short: "AL",
      pmpDomain: "Gestión del alcance",
      summary:
        "Detecta scope creep: cambios no controlados fuera del WBS o baseline. Todo cambio material debe pasar por control integrado de cambios.",
      evaluate:
        "Si el esfuerzo adicional supera ~10 % del plan, emite Change Request, congela nuevos requerimientos y actualiza la línea base.",
    },
    stakeholders: {
      label: "Alineación de stakeholders",
      short: "ST",
      pmpDomain: "Gestión de stakeholders",
      summary:
        "Mide expectativas, apoyo y resistencia de patrocinadores, clientes y áreas impactadas. La matriz poder/interés guía la estrategia de engagement.",
      evaluate:
        "Conflicto activo o patrocinador desalineado es señal roja: convoca sesión ejecutiva y documenta acuerdos antes de seguir ejecutando.",
    },
    impact: {
      label: "Impacto en el negocio",
      short: "IM",
      pmpDomain: "Beneficios y alineación estratégica",
      summary:
        "Evalúa consecuencias operativas, regulatorias o estratégicas si el proyecto falla o se retrasa. Conecta entregables con OKRs y valor de negocio.",
      evaluate:
        "Impacto alto (regulatorio, revenue crítico, reputación) eleva la prioridad de escalamiento aunque otros indicadores estén en amarillo.",
    },
  };

export function getIndicatorLabel(key: string): string {
  const help = ESCALATION_INDICATOR_HELP[key as EscalationIndicatorKey];
  return help?.label ?? key;
}

export function getIndicatorLevelLabel(level: string): string {
  if (level === "high") return "Crítico / Alto";
  if (level === "medium") return "Medio";
  return "Bajo";
}
