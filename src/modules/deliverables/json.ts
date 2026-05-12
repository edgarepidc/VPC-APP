import type { DeliverableStatus } from "./constants";
import { STATUS_LOG_COLORS } from "./constants";

export type DeliverableAcuse = {
  name: string;
  role: string;
  ok: boolean;
  confirmedAt: string | null;
};

export type DeliverableLogEntry = {
  at: string;
  text: string;
  color?: string;
};

export function parseAcuses(raw: unknown): DeliverableAcuse[] {
  if (!Array.isArray(raw)) return [];
  const out: DeliverableAcuse[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = String(o.name ?? o.nombre ?? "").trim();
    if (!name) continue;
    out.push({
      name,
      role: String(o.role ?? o.rol ?? "Revisor").trim() || "Revisor",
      ok: Boolean(o.ok),
      confirmedAt:
        o.confirmedAt != null && String(o.confirmedAt).trim()
          ? String(o.confirmedAt)
          : o.fecha != null && String(o.fecha).trim()
            ? String(o.fecha)
            : null,
    });
  }
  return out;
}

export function parseActivityLog(raw: unknown): DeliverableLogEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: DeliverableLogEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const at = String(o.at ?? "").trim();
    const text = String(o.text ?? o.txt ?? "").trim();
    if (!at || !text) continue;
    out.push({
      at,
      text,
      color: o.color != null ? String(o.color) : undefined,
    });
  }
  return out;
}

export function toJsonAcuses(list: DeliverableAcuse[]): unknown {
  return list.map((a) => ({
    name: a.name,
    role: a.role,
    ok: a.ok,
    confirmedAt: a.confirmedAt,
  }));
}

export function toJsonActivityLog(list: DeliverableLogEntry[]): unknown {
  return list.map((e) => ({
    at: e.at,
    text: e.text,
    ...(e.color ? { color: e.color } : {}),
  }));
}

export function appendLog(
  current: DeliverableLogEntry[],
  text: string,
  status?: DeliverableStatus,
): DeliverableLogEntry[] {
  const color = status ? STATUS_LOG_COLORS[status] : "#888780";
  return [
    ...current,
    {
      at: new Date().toISOString(),
      text,
      color,
    },
  ];
}
