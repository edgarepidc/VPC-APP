import type { ReactNode } from "react";

import {
  dashCard,
  dashSectionSub,
  dashSectionTitle,
  uiSectionLabel,
} from "@/lib/ui-classes";

type MinutesSectionShellProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  headerExtra?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function MinutesSectionShell({
  eyebrow,
  title,
  subtitle,
  headerExtra,
  children,
  className = "",
}: MinutesSectionShellProps) {
  const hasMeta = Boolean(subtitle || headerExtra);

  return (
    <section className={`${dashCard} overflow-hidden ${className}`}>
      <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <div
            className="mt-1 hidden h-9 w-0.5 shrink-0 rounded-full bg-slate-300 sm:block"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            {eyebrow ? <p className={uiSectionLabel}>{eyebrow}</p> : null}
            <h2 className={`${dashSectionTitle} ${eyebrow ? "mt-1" : ""}`}>{title}</h2>
          </div>
        </div>
      </div>

      {hasMeta ? (
        <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
          {subtitle ? <p className={`max-w-3xl ${dashSectionSub}`}>{subtitle}</p> : null}
          {headerExtra ? <div className={subtitle ? "mt-3" : ""}>{headerExtra}</div> : null}
        </div>
      ) : null}

      {children}
    </section>
  );
}
