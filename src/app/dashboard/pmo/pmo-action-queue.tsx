import Link from "next/link";

import { PMO_PROJECTS } from "@/lib/dashboard-paths";
import { dashCard } from "@/lib/ui-classes";

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
      <div className={`${dashCard} border-emerald-200 bg-emerald-50/50 p-4`}>
        <h2 className="text-sm font-semibold text-emerald-950">Cola de acción</h2>
        <p className="mt-1 text-sm text-emerald-800">
          Portafolio estable: sin deterioros, vencimientos ni alertas que requieran acción inmediata.
        </p>
      </div>
    );
  }

  return (
    <section className={`${dashCard} p-4`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Cola de acción</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Priorizado por impacto — abre el detalle desde cada tarjeta.
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
          {items.length} pendiente{items.length !== 1 ? "s" : ""}
        </span>
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
      <p className="mt-3 text-center text-[11px] text-slate-400">
        Módulos detallados en las pestañas superiores ·{" "}
        <Link href={PMO_PROJECTS} className="underline hover:text-slate-600">
          Ver iniciativas
        </Link>
      </p>
    </section>
  );
}
