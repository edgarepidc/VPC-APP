export type TaskChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

function newChecklistId() {
  return `ci_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function parseTaskChecklist(raw: unknown): TaskChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  const out: TaskChecklistItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const text = String(o.text ?? "").trim();
    if (!text) continue;
    out.push({
      id: String(o.id ?? newChecklistId()),
      text,
      done: Boolean(o.done),
    });
  }
  return out;
}

export function serializeTaskChecklist(items: TaskChecklistItem[]): TaskChecklistItem[] {
  return items
    .map((item) => ({
      id: item.id || newChecklistId(),
      text: item.text.trim(),
      done: Boolean(item.done),
    }))
    .filter((item) => item.text.length > 0);
}

export function checklistProgress(items: TaskChecklistItem[]) {
  if (items.length === 0) return null;
  const done = items.filter((i) => i.done).length;
  return { done, total: items.length };
}

export { newChecklistId };
