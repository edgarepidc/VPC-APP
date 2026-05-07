export function getSemaphoreBadge(score: number) {
  if (score >= 70) return { label: "Verde", className: "pmo-badge pmo-badge--green" };
  if (score >= 40) return { label: "Amarillo", className: "pmo-badge pmo-badge--yellow" };
  return { label: "Rojo", className: "pmo-badge pmo-badge--red" };
}

export function getProjectStatusBadge(status: string) {
  const normalized = status.toLowerCase();
  if (["active", "on_track", "on-track", "en curso"].includes(normalized)) {
    return { label: "En curso", className: "pmo-badge pmo-badge--green" };
  }
  if (["planning", "pendiente", "draft"].includes(normalized)) {
    return { label: "Planeacion", className: "pmo-badge pmo-badge--yellow" };
  }
  if (["blocked", "at_risk", "at-risk", "cancelled", "cancelado"].includes(normalized)) {
    return { label: "Riesgo", className: "pmo-badge pmo-badge--red" };
  }
  if (["done", "completed", "cerrado"].includes(normalized)) {
    return { label: "Cerrado", className: "pmo-badge pmo-badge--blue" };
  }
  return { label: status, className: "pmo-badge" };
}
