export const RISK_FIELD_HINTS = {
  title:
    "Describe la amenaza, su causa probable y la consecuencia si se materializa. Sé específico para facilitar el seguimiento.",
  category:
    "Clasifica el riesgo para agrupar reportes, filtros y priorizar la respuesta del equipo.",
  owner:
    "Persona o área responsable de monitorear el riesgo y ejecutar mitigación o contingencia.",
  project: "Proyecto del portafolio al que pertenece este riesgo.",
  deliverable:
    "Opcional. Vincula el riesgo a un entregable concreto si el impacto afecta su cierre o calidad.",
  probability:
    "Probabilidad de ocurrencia antes de mitigación (1–100%). Al mover el slider se recalcula el VME bruto.",
  impact:
    "Costo estimado en pesos mexicanos (MXN) si el riesgo ocurre. Alimenta el mapa de calor y el VME.",
  dueDate:
    "Opcional. Tras esta fecha el riesgo se marca como vencido en el registro y en la cola de acción.",
  mitigation:
    "Acciones preventivas que reducen probabilidad o impacto antes de que el riesgo ocurra.",
  residualProb:
    "Probabilidad estimada después de aplicar la mitigación. Debe ser menor o igual que la probabilidad inicial.",
  trigger:
    "Condición observable y medible que activa el Plan B (ej.: retraso de X días, costo > umbral).",
  contingency:
    "Plan alternativo si la mitigación falla. Obligatorio cuando el score residual supera 10 (umbral de tolerancia).",
} as const;

export const RISK_KPI_HINTS = {
  grossVme: "Valor monetario esperado sin considerar mitigación (probabilidad × impacto).",
  residualVme: "Exposición restante tras aplicar planes de respuesta.",
  critical: "Riesgos activos con score residual mayor a 10; requieren Plan B validado.",
  mitigationEff: "Porcentaje de reducción entre VME bruto y VME residual del portafolio activo.",
} as const;
