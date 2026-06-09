import { TARGET_SUM } from "@/lib/deliverable-weight-utils";

export type DeliverableTemplateItem = {
  title: string;
  phase: string;
  weight: number;
  description?: string;
  acceptanceCriteria?: string;
  daysFromStart: number;
};

export type DeliverableTemplate = {
  id: string;
  name: string;
  description: string;
  items: DeliverableTemplateItem[];
};

export const DELIVERABLE_TEMPLATES: DeliverableTemplate[] = [
  {
    id: "implementacion",
    name: "Implementación estándar",
    description: "Hitos típicos de un proyecto de implementación con go-live.",
    items: [
      {
        title: "Kick-off y plan de trabajo",
        phase: "Inicio",
        weight: 10,
        daysFromStart: 7,
        description: "Acta de inicio, alcance acordado y cronograma base.",
      },
      {
        title: "Diseño funcional / técnico",
        phase: "Diseño",
        weight: 20,
        daysFromStart: 21,
        acceptanceCriteria: "Documento revisado y firmado por el cliente.",
      },
      {
        title: "Desarrollo / configuración",
        phase: "Desarrollo",
        weight: 30,
        daysFromStart: 45,
      },
      {
        title: "Pruebas integrales (UAT)",
        phase: "QA",
        weight: 20,
        daysFromStart: 60,
        acceptanceCriteria: "Matriz de pruebas ejecutada sin bloqueantes.",
      },
      {
        title: "Capacitación y manuales",
        phase: "Despliegue",
        weight: 10,
        daysFromStart: 70,
      },
      {
        title: "Go-live y cierre",
        phase: "Cierre",
        weight: 10,
        daysFromStart: 84,
        acceptanceCriteria: "Acta de aceptación final firmada.",
      },
    ],
  },
  {
    id: "consultoria",
    name: "Consultoría / diagnóstico",
    description: "Entregables de análisis, recomendaciones y presentación ejecutiva.",
    items: [
      {
        title: "Recopilación de insumos",
        phase: "Diagnóstico",
        weight: 15,
        daysFromStart: 10,
      },
      {
        title: "Análisis y hallazgos",
        phase: "Diagnóstico",
        weight: 35,
        daysFromStart: 25,
      },
      {
        title: "Informe de recomendaciones",
        phase: "Entrega",
        weight: 30,
        daysFromStart: 35,
        acceptanceCriteria: "Informe validado por patrocinador.",
      },
      {
        title: "Presentación ejecutiva",
        phase: "Cierre",
        weight: 20,
        daysFromStart: 42,
      },
    ],
  },
  {
    id: "auditoria",
    name: "Auditoría / cumplimiento",
    description: "Evidencias, matriz de hallazgos y plan de remediación.",
    items: [
      {
        title: "Plan de auditoría",
        phase: "Planeación",
        weight: 15,
        daysFromStart: 5,
      },
      {
        title: "Recolección de evidencias",
        phase: "Ejecución",
        weight: 25,
        daysFromStart: 20,
      },
      {
        title: "Matriz de hallazgos",
        phase: "Ejecución",
        weight: 30,
        daysFromStart: 30,
      },
      {
        title: "Informe final",
        phase: "Cierre",
        weight: 20,
        daysFromStart: 40,
      },
      {
        title: "Plan de remediación",
        phase: "Seguimiento",
        weight: 10,
        daysFromStart: 45,
      },
    ],
  },
];

export function normalizeTemplateWeights(items: DeliverableTemplateItem[]): number[] {
  const raw = items.map((i) => Math.max(1, i.weight));
  const sum = raw.reduce((a, b) => a + b, 0);
  if (sum === TARGET_SUM) return raw;
  const scaled = raw.map((w) => Math.max(1, Math.round((w / sum) * TARGET_SUM)));
  let diff = TARGET_SUM - scaled.reduce((a, b) => a + b, 0);
  let idx = 0;
  while (diff !== 0 && idx < scaled.length * 4) {
    const i = idx % scaled.length;
    if (diff > 0) {
      scaled[i]! += 1;
      diff -= 1;
    } else if (scaled[i]! > 1) {
      scaled[i]! -= 1;
      diff += 1;
    }
    idx += 1;
  }
  return scaled;
}

export function templateDueDate(start: Date, daysFromStart: number): Date {
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + daysFromStart);
  return d;
}

export function getDeliverableTemplate(id: string): DeliverableTemplate | undefined {
  return DELIVERABLE_TEMPLATES.find((t) => t.id === id);
}
