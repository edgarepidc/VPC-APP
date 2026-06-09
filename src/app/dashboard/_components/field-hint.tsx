"use client";

type FieldHintProps = {
  text: string;
};

/** Icono ? con tooltip al hover/focus — mismo patrón que las fichas del encabezado PMO. */
export function FieldHint({ text }: FieldHintProps) {
  return (
    <span className="group/hint relative ml-1.5 inline-flex shrink-0">
      <button
        type="button"
        tabIndex={-1}
        aria-label={text}
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-semibold leading-none text-slate-500 hover:border-slate-400 hover:text-slate-700"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-20 hidden w-52 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left text-[11px] font-normal normal-case leading-snug text-slate-600 shadow-lg group-hover/hint:block group-focus-within/hint:block sm:w-60"
      >
        {text}
      </span>
    </span>
  );
}
