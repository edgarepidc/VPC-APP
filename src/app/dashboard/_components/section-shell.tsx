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
  /** Acciones o selectores alineados a la derecha del encabezado (misma línea que el título). */
  headerTrailing?: ReactNode;
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
  headerTrailing,
  headerExtra,
  children,
  className = "",
  titleAs = "h2",
  bodyClassName = "",
}: DashboardSectionShellProps) {
  const hasMeta = Boolean(subtitle || headerExtra);
  const TitleTag = titleAs;

  return (
    <section className={`${dashCard} overflow-hidden ${className}`}>
      <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div
              className="mt-1 hidden h-9 w-0.5 shrink-0 rounded-full bg-slate-300 sm:block"
              aria-hidden
            />
            <div className="min-w-0">
              {eyebrow ? <p className={uiSectionLabel}>{eyebrow}</p> : null}
              <TitleTag className={`${dashSectionTitle} ${eyebrow ? "mt-1" : ""}`}>
                {title}
              </TitleTag>
            </div>
          </div>

          {headerTrailing ? (
            <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
              {headerTrailing}
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
