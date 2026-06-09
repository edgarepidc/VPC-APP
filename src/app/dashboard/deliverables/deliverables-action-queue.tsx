"use client";

import type { DeliverableActionItem } from "./deliverable-utils";

const kindStyle: Record<
  DeliverableActionItem["kind"],
  { dot: string; badge: string }
> = {
  overdue: { dot: "bg-rose-500", badge: "bg-rose-50 text-rose-800" },
  due_soon: { dot: "bg-amber-500", badge: "bg-amber-50 text-amber-900" },
  review: { dot: "bg-sky-500", badge: "bg-sky-50 text-sky-900" },
  acuse_pending: { dot: "bg-violet-500", badge: "bg-violet-50 text-violet-900" },
  blocked: { dot: "bg-slate-500", badge: "bg-slate-100 text-slate-800" },
};

type DeliverablesActionQueueProps = {
  items: DeliverableActionItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
};

export function DeliverablesActionQueue({
  items,
  activeId,
  onSelect,
}: DeliverablesActionQueueProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-800">
        Nada urgente en este alcance. Todos los hitos están al día.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Requiere acción
        </p>
        <span className="text-xs text-slate-500">{items.length}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => {
          const style = kindStyle[item.kind];
          const isActive = activeId === item.row.id;
          return (
            <button
              key={item.id}
              type="button"
              onMouseEnter={() => onSelect(item.row.id)}
              onFocus={() => onSelect(item.row.id)}
              onClick={() => onSelect(item.row.id)}
              className={`flex min-w-[200px] max-w-[260px] shrink-0 items-start gap-2 rounded-lg border px-3 py-2 text-left transition ${
                isActive
                  ? "border-slate-800 bg-white shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
              <span className="min-w-0">
                <span
                  className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${style.badge}`}
                >
                  {item.kind === "overdue"
                    ? "Vencido"
                    : item.kind === "due_soon"
                      ? "Próximo"
                      : item.kind === "review"
                        ? "Revisión"
                        : item.kind === "blocked"
                          ? "Bloqueado"
                          : "Acuses"}
                </span>
                <span className="mt-1 block truncate text-xs font-medium text-slate-800">
                  {item.row.title}
                </span>
                <span className="block truncate text-[10px] text-slate-500">
                  {item.row.projectName}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
