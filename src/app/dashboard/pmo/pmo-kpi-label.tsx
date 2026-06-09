"use client";

import type { ReactNode } from "react";

import { FieldHint } from "@/app/dashboard/_components/field-hint";

type PmoKpiLabelProps = {
  children: ReactNode;
  hint?: string;
};

export function PmoKpiLabel({ children, hint }: PmoKpiLabelProps) {
  return (
    <p className="mb-1 flex items-center text-xs text-slate-500">
      <span>{children}</span>
      {hint ? <FieldHint text={hint} /> : null}
    </p>
  );
}
