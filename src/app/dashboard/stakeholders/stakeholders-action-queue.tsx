"use client";

import {
  type StakeholderActionItem,
  type StakeholderActionKind,
  stakeholderActionKindLabel,
} from "./stakeholder-action-utils";

const kindStyle: Record<StakeholderActionKind, string> = {
  project_empty: "bg-red-50 text-red-800",
  project_no_promoters: "bg-orange-50 text-orange-900",
  promoter_no_obs: "bg-amber-50 text-amber-900",
  high_influence_no_obs: "bg-sky-50 text-sky-900",
};

type StakeholdersActionQueueProps = {
  items: StakeholderActionItem[];
  activeId: string | null;
  onSelect: (item: StakeholderActionItem) => void;
};

export function StakeholdersActionQueue({
  items,
  activeId,
  onSelect,
}: StakeholdersActionQueueProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-800">
        Sin interesados que requieran acción inmediata en este alcance.
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
          const isActive = activeId === (item.stakeholderId ?? item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
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
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${kindStyle[kind]}`}
                  >
                    {stakeholderActionKindLabel(kind)}
                  </span>
                ))}
              </div>
              <span className="mt-1.5 truncate text-xs font-medium text-slate-800">{item.label}</span>
              <span className="truncate text-[10px] text-slate-500">{item.sublabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
