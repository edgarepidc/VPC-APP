"use client";

import type { ReactNode } from "react";

import { FieldHint } from "@/app/dashboard/_components/field-hint";
import { uiLabel } from "@/lib/ui-classes";

type RiskFieldLabelProps = {
  children: ReactNode;
  hint?: string;
  required?: boolean;
};

export function RiskFieldLabel({ children, hint, required }: RiskFieldLabelProps) {
  return (
    <span className={`${uiLabel} mb-1 flex items-center`}>
      <span>
        {children}
        {required ? " *" : null}
      </span>
      {hint ? <FieldHint text={hint} placement="bottom" /> : null}
    </span>
  );
}

export function RiskKpiLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <span className="flex items-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      <span>{children}</span>
      {hint ? <FieldHint text={hint} placement="bottom" /> : null}
    </span>
  );
}
