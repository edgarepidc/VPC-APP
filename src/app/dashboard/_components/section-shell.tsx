import type { ReactNode } from "react";

import {
  dashCard,
  dashSectionSub,
  dashSectionTitle,
  uiSectionLabel,
} from "@/lib/ui-classes";

export type DashboardSectionShellProps = {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  /** Selector de alcance u otra acción destacada a la izquierda del título. */
  headerLead?: ReactNode;
  headerExtra?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Nivel del encabezado principal (h1 en página única, h2 en subsecciones). */
  titleAs?: "h1" | "h2";
  /** Padding en el cuerpo de la sección (por defecto ninguno). */
  bodyClassName?: string;
};

export function DashboardSectionShell({
  eyebrow,
  title,
  subtitle,
  headerLead,
  headerExtra,
  children,
  className = "",
  titleAs = "h2",
  bodyClassName = "",
}: DashboardSectionShellProps) {
  const hasMeta = Boolean(subtitle || headerExtra);
  const TitleTag = titleAs;
  const compactHeader = Boolean(headerLead);

  return (
    <section className={`${dashCard} overflow-hidden ${className}`}>
      <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
        <div
          className={
            compactHeader
              ? "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              : "flex items-start gap-3"
          }
        >
          {compactHeader ? (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
              {headerLead}
            </div>
          ) : (
            <>
              <div
                className="mt-1 hidden h-9 w-0.5 shrink-0 rounded-full bg-slate-300 sm:block"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                {eyebrow ? <p className={uiSectionLabel}>{eyebrow}</p> : null}
                <TitleTag className={`${dashSectionTitle} ${eyebrow ? "mt-1" : ""}`}>
                  {title}
                </TitleTag>
              </div>
            </>
          )}

          {compactHeader ? (
            <div className="shrink-0 sm:text-right">
              <TitleTag className={dashSectionTitle}>{title}</TitleTag>
            </div>
          ) : null}
        </div>
      </div>

      {hasMeta ? (
        <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
          {subtitle ? (
            <div className={`max-w-3xl ${dashSectionSub}`}>{subtitle}</div>
          ) : null}
          {headerExtra ? <div className={subtitle ? "mt-3" : ""}>{headerExtra}</div> : null}
        </div>
      ) : null}

      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
