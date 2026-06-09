"use client";

import type { RiskActionItem, RiskActionKind } from "./risk-action-utils";

const kindStyle: Record<RiskActionKind, { badge: string; label: string }> = {
  critical: { badge: "bg-red-50 text-red-800", label: "Crítico" },
  no_plan_b: { badge: "bg-orange-50 text-orange-900", label: "Sin Plan B" },
  expired: { badge: "bg-amber-50 text-amber-900", label: "Vencido" },
  due_soon: { badge: "bg-sky-50 text-sky-900", label: "Caduca pronto" },
};

type RisksActionQueueProps = {
  items: RiskActionItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
};

export function RisksActionQueue({ items, activeId, onSelect }: RisksActionQueueProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-800">
        Sin riesgos que requieran acción inmediata en este alcance.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-600">Requiere acción</p>
        <span className="text-xs text-slate-500">{items.length}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => {
          const isActive = activeId === item.row.id;
          return (
            <button
              key={item.row.id}
              type="button"
              onClick={() => onSelect(item.row.id)}
              className={`flex min-w-[220px] max-w-[280px] shrink-0 flex-col rounded-lg border px-3 py-2 text-left transition ${
                isActive
                  ? "border-slate-800 bg-white shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex flex-wrap gap-1">
                {item.kinds.map((kind) => (
                  <span
                    key={kind}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${kindStyle[kind].badge}`}
                  >
                    {kindStyle[kind].label}
                  </span>
                ))}
              </div>
              <span className="mt-1.5 truncate text-xs font-medium text-slate-800">
                {item.row.title}
              </span>
              <span className="truncate text-[10px] text-slate-500">{item.row.project.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
