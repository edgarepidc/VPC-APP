/** Coherente con stakeholder-matrix.html: X = interés, Y = influencia (0–10). */

export type QuadrantId = "q1" | "q2" | "q3" | "q4";

export type QuadrantPlaybook = {
  id: QuadrantId;
  shortLabel: string;
  fullLabel: string;
  strategy: string;
  tactics: string[];
  freq: string;
  freqIcon: string;
};

export const QUADRANT_PLAYBOOK: Record<QuadrantId, QuadrantPlaybook> = {
  q1: {
    id: "q1",
    shortLabel: "Promotor",
    fullLabel: "Promotores / Jugadores clave",
    strategy: "Gestionar de cerca",
    tactics: [
      "Involucrar en decisiones estrategicas desde las fases tempranas del proyecto.",
      "Agendar reuniones 1:1 semanales para mantener alineacion y resolver bloqueos.",
      "Validar hitos criticos con ellos antes de presentaciones generales al equipo.",
    ],
    freq: "Alta / Personalizada",
    freqIcon: "🔴",
  },
  q2: {
    id: "q2",
    shortLabel: "Latente",
    fullLabel: "Latentes / Cumplidores",
    strategy: "Mantener satisfecho",
    tactics: [
      "Enviar reportes ejecutivos de alto nivel, concisos y orientados a resultados de negocio.",
      "Evitar la saturacion de correos y solicitudes de validacion operativas.",
      "Asegurar que sus requerimientos de gobernanza y cumplimiento se cubran puntualmente.",
    ],
    freq: "Media / Formal",
    freqIcon: "🟡",
  },
  q3: {
    id: "q3",
    shortLabel: "Defensor",
    fullLabel: "Defensores / Aliados",
    strategy: "Mantener informado",
    tactics: [
      'Utilizarlos como "embajadores" del proyecto dentro de sus equipos y areas.',
      "Enviar newsletters o actualizaciones de avance con detalle tecnico y funcional.",
      "Invitarlos a demos y sesiones tecnicas para mantener su motivacion alta.",
    ],
    freq: "Media-Alta / Informativa",
    freqIcon: "🔵",
  },
  q4: {
    id: "q4",
    shortLabel: "Espectador",
    fullLabel: "Espectadores",
    strategy: "Monitorear",
    tactics: [
      "Limitar la comunicacion a actualizaciones generales de hitos principales.",
      "Aplicar esfuerzo minimo de gestion; reasignar cuadrante si su rol cambia.",
      "Mantener en listas de distribucion general sin comunicacion personalizada.",
    ],
    freq: "Baja / General",
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
