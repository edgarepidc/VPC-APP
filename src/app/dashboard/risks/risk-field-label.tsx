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
      {hint ? <FieldHint text={hint} /> : null}
    </span>
  );
}

export function RiskKpiLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <p className="mb-2 flex items-center text-xs text-slate-500">
      <span>{children}</span>
      {hint ? <FieldHint text={hint} /> : null}
    </p>
  );
}
