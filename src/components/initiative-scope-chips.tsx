"use client";

export type InitiativeOption = { id: string; name: string };

type InitiativeScopeChipsProps = {
  projects: InitiativeOption[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  emptyMessage?: string;
};

export function InitiativeScopeChips({
  projects,
  selected,
  onToggle,
  emptyMessage = "No hay iniciativas en esta organización.",
}: InitiativeScopeChipsProps) {
  if (projects.length === 0) {
    return <p className="mt-2 text-xs text-amber-700">{emptyMessage}</p>;
  }

  return (
    <div className="mt-2 flex max-h-48 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2.5">
      {projects.map((p) => {
        const isSelected = selected.has(p.id);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onToggle(p.id)}
            aria-pressed={isSelected}
            className={
              isSelected
                ? "inline-flex max-w-full items-center rounded-full border-2 border-blue-500 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-900 transition hover:border-blue-600 hover:bg-blue-100"
                : "inline-flex max-w-full items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-800"
            }
          >
            <span className="truncate">{p.name}</span>
          </button>
        );
      })}
    </div>
  );
}
