export const TASK_LABEL_COLOR_KEYS = [
  "rose",
  "orange",
  "amber",
  "lime",
  "emerald",
  "teal",
  "sky",
  "indigo",
  "violet",
  "fuchsia",
  "slate",
] as const;

export type TaskLabelColorKey = (typeof TASK_LABEL_COLOR_KEYS)[number];

export type TaskLabelRecord = {
  id: string;
  name: string;
  colorKey: string;
};

export const TASK_LABEL_COLOR_THEME: Record<
  TaskLabelColorKey,
  { chip: string; dot: string; columnAccent: string; columnBg: string; columnBorder: string }
> = {
  rose: {
    chip: "bg-rose-50 text-rose-800 ring-rose-200",
    dot: "bg-rose-500",
    columnAccent: "bg-rose-500",
    columnBg: "bg-rose-50/80",
    columnBorder: "border-rose-200",
  },
  orange: {
    chip: "bg-orange-50 text-orange-900 ring-orange-200",
    dot: "bg-orange-500",
    columnAccent: "bg-orange-500",
    columnBg: "bg-orange-50/80",
    columnBorder: "border-orange-200",
  },
  amber: {
    chip: "bg-amber-50 text-amber-900 ring-amber-200",
    dot: "bg-amber-500",
    columnAccent: "bg-amber-500",
    columnBg: "bg-amber-50/80",
    columnBorder: "border-amber-200",
  },
  lime: {
    chip: "bg-lime-50 text-lime-900 ring-lime-200",
    dot: "bg-lime-500",
    columnAccent: "bg-lime-500",
    columnBg: "bg-lime-50/80",
    columnBorder: "border-lime-200",
  },
  emerald: {
    chip: "bg-emerald-50 text-emerald-900 ring-emerald-200",
    dot: "bg-emerald-500",
    columnAccent: "bg-emerald-500",
    columnBg: "bg-emerald-50/80",
    columnBorder: "border-emerald-200",
  },
  teal: {
    chip: "bg-teal-50 text-teal-900 ring-teal-200",
    dot: "bg-teal-500",
    columnAccent: "bg-teal-500",
    columnBg: "bg-teal-50/80",
    columnBorder: "border-teal-200",
  },
  sky: {
    chip: "bg-sky-50 text-sky-900 ring-sky-200",
    dot: "bg-sky-500",
    columnAccent: "bg-sky-500",
    columnBg: "bg-sky-50/80",
    columnBorder: "border-sky-200",
  },
  indigo: {
    chip: "bg-indigo-50 text-indigo-900 ring-indigo-200",
    dot: "bg-indigo-500",
    columnAccent: "bg-indigo-500",
    columnBg: "bg-indigo-50/80",
    columnBorder: "border-indigo-200",
  },
  violet: {
    chip: "bg-violet-50 text-violet-900 ring-violet-200",
    dot: "bg-violet-500",
    columnAccent: "bg-violet-500",
    columnBg: "bg-violet-50/80",
    columnBorder: "border-violet-200",
  },
  fuchsia: {
    chip: "bg-fuchsia-50 text-fuchsia-900 ring-fuchsia-200",
    dot: "bg-fuchsia-500",
    columnAccent: "bg-fuchsia-500",
    columnBg: "bg-fuchsia-50/80",
    columnBorder: "border-fuchsia-200",
  },
  slate: {
    chip: "bg-slate-100 text-slate-700 ring-slate-200",
    dot: "bg-slate-500",
    columnAccent: "bg-slate-600",
    columnBg: "bg-slate-50",
    columnBorder: "border-slate-200",
  },
};

const DEFAULT_LABEL_SEED: { name: string; colorKey: TaskLabelColorKey }[] = [
  { name: "Diseño", colorKey: "violet" },
  { name: "Desarrollo", colorKey: "sky" },
  { name: "QA", colorKey: "amber" },
  { name: "Documentación", colorKey: "emerald" },
];

export function normalizeTaskLabelColorKey(raw: string): TaskLabelColorKey {
  const key = raw.trim().toLowerCase() as TaskLabelColorKey;
  return TASK_LABEL_COLOR_KEYS.includes(key) ? key : "sky";
}

export function parseTaskLabelIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    const id = String(item ?? "").trim();
    if (id) out.push(id);
  }
  return [...new Set(out)];
}

export function serializeTaskLabelIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

export function resolveTaskLabels(
  labelIds: string[],
  catalog: TaskLabelRecord[],
): TaskLabelRecord[] {
  const byId = new Map(catalog.map((l) => [l.id, l]));
  return labelIds.map((id) => byId.get(id)).filter((l): l is TaskLabelRecord => Boolean(l));
}

export function labelTheme(colorKey: string) {
  return TASK_LABEL_COLOR_THEME[normalizeTaskLabelColorKey(colorKey)];
}

export { DEFAULT_LABEL_SEED };
