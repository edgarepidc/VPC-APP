"use client";

import type { ReactNode } from "react";

import { FieldHint } from "@/app/dashboard/_components/field-hint";
import { uiLabel } from "@/lib/ui-classes";

type StakeholderFieldLabelProps = {
  children: ReactNode;
  hint?: string;
  required?: boolean;
};

export function StakeholderFieldLabel({ children, hint, required }: StakeholderFieldLabelProps) {
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

export function StakeholderKpiLabel({
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
        compact ? "mb-0 text-[10px] leading-tight" : "mb-2 text-xs"
      }`}
    >
      <span className="truncate">{children}</span>
      {hint ? <FieldHint text={hint} /> : null}
    </p>
  );
}
