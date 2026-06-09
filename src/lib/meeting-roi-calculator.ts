import type {
  MeetingCostLevel,
  MeetingObjective,
  RoleCosts,
  RoleCounts,
} from "@/modules/meeting-roi/service";

export const MEETING_ROLE_RATES: RoleCosts = {
  junior: 500,
  senior: 1200,
  director: 2500,
  tech: 900,
};

export type MeetingCalculatorInput = {
  junior: number;
  senior: number;
  director: number;
  tech: number;
  hours: number;
  mins: number;
  objective: MeetingObjective;
};

export type MeetingCalculatorSnapshot = {
  objective: MeetingObjective;
  totalCost: number;
  costLevel: MeetingCostLevel;
  costPerMinute: number;
  totalParticipants: number;
  durationMinutes: number;
  diagnosisTitle: string;
  diagnosisText: string;
  participants: RoleCounts;
  roleCosts: RoleCosts;
};

function fmtMxn(n: number) {
  return n.toLocaleString("es-MX", { maximumFractionDigits: 0 });
}

export function getMeetingCostLevel(totalCost: number): MeetingCostLevel {
  if (totalCost < 3000) return "Bajo";
  if (totalCost < 8000) return "Moderado";
  if (totalCost < 15000) return "Alto";
  return "Crítico";
}

export function getMeetingDiagnosis(
  objective: MeetingObjective,
  cost: number,
  people: number,
  minutes: number,
  perMin: number,
): { title: string; text: string; tone: "info" | "warning" | "success" | "danger" } {
  if (cost === 0 || people === 0 || minutes === 0) {
    return {
      tone: "info",
      title: "Análisis de valor",
      text: "Configura los participantes y duración para ver el análisis de eficiencia.",
    };
  }

  if (objective === "informativa") {
    if (cost > 3000) {
      return {
        tone: "warning",
        title: "Alerta de eficiencia",
        text: `Este mensaje pudo ser un correo electrónico. Estás invirtiendo $${fmtMxn(cost)} MXN en una sesión unidireccional con ${people} ${people === 1 ? "persona" : "personas"}. Considera un resumen escrito o video asíncrono.`,
      };
    }
    return {
      tone: "info",
      title: "Sesión informativa",
      text: "Inversión razonable para una sesión informativa. Asegúrate de que todos los participantes necesiten estar presentes.",
    };
  }

  if (objective === "decision") {
    if (cost > 8000) {
      return {
        tone: "success",
        title: "Inversión estratégica justificada",
        text: `El costo de $${fmtMxn(cost)} MXN está justificado si se logra un acuerdo vinculante. Documenta decisiones y próximos pasos con responsables y fechas.`,
      };
    }
    return {
      tone: "success",
      title: "Inversión estratégica",
      text: "Sesión de decisión con costo controlado. Estructura la agenda con máximo 3 decisiones clave.",
    };
  }

  if (objective === "tecnica") {
    if (cost > 10000) {
      return {
        tone: "warning",
        title: "Revisión de alcance recomendada",
        text: `Planeación técnica por $${fmtMxn(cost)} MXN con ${people} participantes puede optimizarse dividiendo definición y validación.`,
      };
    }
    return {
      tone: "info",
      title: "Planeación técnica",
      text: "Buena relación costo-valor. El output debe ser diseño documentado o tickets priorizados.",
    };
  }

  return {
    tone: "danger",
    title: "Control de daños activo",
    text: `Cada minuto de crisis cuesta $${fmtMxn(Math.round(perMin))} MXN. Limita la sesión a quienes pueden decidir o actuar sobre el incidente.`,
  };
}

export function calculateMeetingRoi(input: MeetingCalculatorInput): MeetingCalculatorSnapshot {
  const totalMinutes = input.hours * 60 + input.mins;
  const totalHours = totalMinutes / 60;
  const participants: RoleCounts = {
    junior: Math.max(0, input.junior),
    senior: Math.max(0, input.senior),
    director: Math.max(0, input.director),
    tech: Math.max(0, input.tech),
  };

  const roleCosts: RoleCosts = {
    junior: participants.junior * MEETING_ROLE_RATES.junior * totalHours,
    senior: participants.senior * MEETING_ROLE_RATES.senior * totalHours,
    director: participants.director * MEETING_ROLE_RATES.director * totalHours,
    tech: participants.tech * MEETING_ROLE_RATES.tech * totalHours,
  };

  const totalCost =
    roleCosts.junior + roleCosts.senior + roleCosts.director + roleCosts.tech;
  const totalParticipants =
    participants.junior + participants.senior + participants.director + participants.tech;
  const costPerMinute = totalMinutes > 0 ? totalCost / totalMinutes : 0;
  const diagnosis = getMeetingDiagnosis(
    input.objective,
    totalCost,
    totalParticipants,
    totalMinutes,
    costPerMinute,
  );

  return {
    objective: input.objective,
    totalCost,
    costLevel: getMeetingCostLevel(totalCost),
    costPerMinute,
    totalParticipants,
    durationMinutes: totalMinutes,
    diagnosisTitle: diagnosis.title,
    diagnosisText: diagnosis.text,
    participants,
    roleCosts,
  };
}
