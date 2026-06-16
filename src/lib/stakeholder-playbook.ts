/** Coherente con stakeholder-matrix.html: X = interés, Y = influencia (0–10). */

export type QuadrantId = "q1" | "q2" | "q3" | "q4";

export type QuadrantPlaybook = {
  id: QuadrantId;
  code: string;
  shortLabel: string;
  fullLabel: string;
  positionHint: string;
  strategy: string;
  strategyRationale: string;
  tactics: string[];
  freq: string;
  freqIcon: string;
};

export const QUADRANT_PLAYBOOK: Record<QuadrantId, QuadrantPlaybook> = {
  q1: {
    id: "q1",
    code: "Q1",
    shortLabel: "Promotor",
    fullLabel: "Promotores / Jugadores clave",
    positionHint: "Alta influencia · bajo interés aparente",
    strategy: "Gestionar de cerca",
    strategyRationale:
      "Tienen poder para frenar o impulsar el proyecto aunque no participen a diario. Anticípate, alinea expectativas y evita sorpresas en comités.",
    tactics: [
      "Involúcralos en decisiones estratégicas desde las fases tempranas.",
      "Agenda reuniones 1:1 semanales para mantener alineación y resolver bloqueos.",
      "Valida hitos críticos con ellos antes de presentaciones al equipo o a dirección.",
    ],
    freq: "Alta · personalizada",
    freqIcon: "🔴",
  },
  q2: {
    id: "q2",
    code: "Q2",
    shortLabel: "Latente",
    fullLabel: "Latentes / Cumplidores",
    positionHint: "Alta influencia · alto interés",
    strategy: "Mantener satisfecho",
    strategyRationale:
      "Son decisores comprometidos con el resultado. Necesitan visibilidad ejecutiva y cumplimiento puntual, sin ruido operativo.",
    tactics: [
      "Envía reportes ejecutivos concisos, orientados a resultados de negocio y riesgos.",
      "Evita saturarlos con correos operativos o validaciones de bajo impacto.",
      "Cubre a tiempo requerimientos de gobernanza, compliance y reporting formal.",
    ],
    freq: "Media · formal",
    freqIcon: "🟡",
  },
  q3: {
    id: "q3",
    code: "Q3",
    shortLabel: "Defensor",
    fullLabel: "Defensores / Aliados",
    positionHint: "Baja influencia · bajo interés",
    strategy: "Mantener informado",
    strategyRationale:
      "Apoyan el proyecto desde su ámbito aunque no decidan el rumbo. Son útiles como amplificadores internos si reciben información clara.",
    tactics: [
      'Úsalos como "embajadores" del proyecto dentro de sus equipos y áreas.',
      "Comparte newsletters o avances con detalle técnico y funcional relevante para su rol.",
      "Invítalos a demos y sesiones técnicas para sostener su motivación y advocacy.",
    ],
    freq: "Media-alta · informativa",
    freqIcon: "🔵",
  },
  q4: {
    id: "q4",
    code: "Q4",
    shortLabel: "Espectador",
    fullLabel: "Espectadores",
    positionHint: "Baja influencia · alto interés",
    strategy: "Monitorear",
    strategyRationale:
      "Les importa el proyecto pero tienen poco poder de decisión. Mantén comunicación ligera y revisa si su rol o influencia cambia.",
    tactics: [
      "Limita la comunicación a actualizaciones generales de hitos principales.",
      "Aplica el mínimo esfuerzo de gestión; reevalúa el cuadrante si ascienden de rol.",
      "Inclúyelos en listas de distribución general sin mensajes personalizados.",
    ],
    freq: "Baja · general",
    freqIcon: "⚪",
  },
};

export function getQuadrantId(influence: number, interest: number): QuadrantId {
  const iy = influence;
  const ix = interest;
  if (iy >= 5 && ix < 5) return "q1";
  if (iy >= 5 && ix >= 5) return "q2";
  if (iy < 5 && ix < 5) return "q3";
  return "q4";
}

export function quadrantLabelFull(influence: number, interest: number): string {
  const id = getQuadrantId(influence, interest);
  return QUADRANT_PLAYBOOK[id].fullLabel;
}

export function quadrantPlaybookFor(influence: number, interest: number): QuadrantPlaybook {
  return QUADRANT_PLAYBOOK[getQuadrantId(influence, interest)];
}

/** Tácticas unidas para exportación tabular (CSV, Excel). */
export function formatQuadrantTacticsForExport(tactics: string[]): string {
  return tactics.join(" | ");
}
