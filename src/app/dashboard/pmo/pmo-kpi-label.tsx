"use client";

import type { ReactNode } from "react";

import { FieldHint } from "@/app/dashboard/_components/field-hint";

type PmoKpiLabelProps = {
  children: ReactNode;
  hint?: string;
  compact?: boolean;
};

export function PmoKpiLabel({
  children,
  hint,
  compact,
}: {
  children: ReactNode;
  hint?: string;
  compact?: boolean;
}) {
  return (
    <p
      className={`flex items-center text-slate-500 ${
        compact ? "mb-0 text-[10px] leading-tight" : "mb-1 text-xs"
      }`}
    >
      <span className="truncate">{children}</span>
      {hint ? <FieldHint text={hint} placement="bottom" /> : null}
    </p>
  );
}
