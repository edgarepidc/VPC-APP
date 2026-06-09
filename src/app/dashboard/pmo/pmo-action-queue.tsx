import Link from "next/link";

import { type PmoActionItem, type PmoActionKind, pmoActionKindLabel } from "./pmo-action-utils";

const kindStyle: Record<PmoActionKind, string> = {
  escalation_deterioration: "bg-red-50 text-red-800",
  risk_critical: "bg-amber-50 text-amber-900",
  deliverable_overdue: "bg-rose-50 text-rose-800",
  meeting_cost: "bg-orange-50 text-orange-900",
  stakeholder_alert: "bg-sky-50 text-sky-900",
};

type PmoActionQueueProps = {
  items: PmoActionItem[];
};

export function PmoActionQueue({ items }: PmoActionQueueProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-800">
        Sin elementos que requieran acción inmediata en el portafolio visible.
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
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex min-w-[220px] max-w-[280px] shrink-0 flex-col rounded-lg border border-slate-200 bg-white px-3 py-2 transition hover:border-slate-300 hover:shadow-sm"
          >
            <span
              className={`w-fit rounded px-1.5 py-0.5 text-[10px] font-medium ${kindStyle[item.kind]}`}
            >
              {pmoActionKindLabel(item.kind)}
            </span>
            <span className="mt-1.5 truncate text-xs font-medium text-slate-800">{item.label}</span>
            <span className="truncate text-[10px] text-slate-500">{item.sublabel}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
