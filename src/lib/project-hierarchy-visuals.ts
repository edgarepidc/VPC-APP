/** Acentos de borde superior para tarjetas de iniciativa (rotación cíclica). */
export const PROJECT_CARD_ACCENTS = [
  "border-t-blue-500",
  "border-t-emerald-500",
  "border-t-amber-500",
  "border-t-violet-500",
  "border-t-slate-500",
] as const;

export function projectCardAccent(index: number) {
  return PROJECT_CARD_ACCENTS[index % PROJECT_CARD_ACCENTS.length];
}
