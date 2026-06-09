export const STAKEHOLDER_FIELD_HINTS = {
  project: "Proyecto del portafolio al que pertenece este interesado.",
  name: "Nombre de la persona o grupo que influye o se ve afectado por el proyecto.",
  role: "Cargo, área o relación con el proyecto (ej. Sponsor, TI, Legal).",
  influence:
    "Capacidad de afectar decisiones, recursos o el rumbo del proyecto (0 = baja, 10 = muy alta).",
  interest:
    "Nivel de implicación o preocupación por los resultados del proyecto (0 = bajo, 10 = muy alto).",
  observation:
    "Notas de contexto, riesgos de relación o acuerdos de comunicación. Recomendado para promotores.",
} as const;

export const STAKEHOLDER_KPI_HINTS = {
  total: "Interesados registrados en el alcance activo (proyecto filtrado o portafolio completo).",
  promotores: "Jugadores clave: alta influencia y bajo interés aparente — gestionar de cerca.",
  latentes: "Alta influencia e interés — mantener satisfechos con comunicación ejecutiva.",
  gaps: "Proyectos sin interesados o sin promotores identificados en la matriz.",
} as const;
