import type { ReactNode } from "react";

type MinutesSectionShellProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  headerExtra?: ReactNode;
  children: ReactNode;
  gradient?: "indigo" | "violet" | "emerald";
  className?: string;
};

const GRADIENTS = {
  indigo: "from-indigo-600 via-violet-600 to-indigo-700",
  violet: "from-violet-600 via-purple-600 to-indigo-700",
  emerald: "from-emerald-600 via-teal-600 to-cyan-700",
} as const;

export function MinutesSectionShell({
  eyebrow,
  title,
  subtitle,
  headerExtra,
  children,
  gradient = "indigo",
  className = "",
}: MinutesSectionShellProps) {
  const hasMeta = Boolean(subtitle || headerExtra);

  return (
    <section
      className={`overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-md ${className}`}
    >
      <div
        className={`bg-gradient-to-r ${GRADIENTS[gradient]} px-4 py-3 text-white sm:px-5`}
      >
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-0.5 text-lg font-semibold leading-snug sm:text-xl">{title}</h2>
      </div>

      {hasMeta ? (
        <div className="border-b border-indigo-50 bg-indigo-50/40 px-4 py-3 sm:px-5">
          {subtitle ? (
            <p className="max-w-3xl text-sm leading-relaxed text-slate-600">{subtitle}</p>
          ) : null}
          {headerExtra ? <div className={subtitle ? "mt-3" : ""}>{headerExtra}</div> : null}
        </div>
      ) : null}

      {children}
    </section>
  );
}
