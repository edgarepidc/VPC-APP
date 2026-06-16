import Link from "next/link";

import { PMO_ESCALATIONS } from "@/lib/dashboard-paths";
import { formatRelativeDate } from "@/lib/escalation-utils";
import { dashAlertWarn, dashCard } from "@/lib/ui-classes";

export type DeteriorationAlertRow = {
  projectId: string;
  projectName: string;
  previousAt: string;
  currentAt: string;
  topic: string | null;
  title: string;
};

type EscalationDeteriorationAlertsProps = {
  alerts: DeteriorationAlertRow[];
  /** Omit for PMO hub link; pass `false` to hide the link. */
  viewAllHref?: string | false;
  onProjectSelect?: (projectId: string) => void;
};

export function EscalationDeteriorationAlerts({
  alerts,
  viewAllHref,
  onProjectSelect,
}: EscalationDeteriorationAlertsProps) {
  if (alerts.length === 0) return null;

  const showViewAll = viewAllHref !== false;
  const href = typeof viewAllHref === "string" ? viewAllHref : PMO_ESCALATIONS;

  return (
    <section className={`${dashCard} border-amber-200 bg-amber-50/50 p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-amber-950">Alertas de deterioro</h2>
          <p className="mt-1 text-sm text-amber-900/80">
            Proyectos que pasaron de verde a rojo en los últimos 7 días.
          </p>
        </div>
        {showViewAll ? (
          <Link
            href={href}
            className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-950 hover:bg-amber-50"
          >
            Ver todos
          </Link>
        ) : null}
      </div>
      <ul className="mt-3 space-y-2">
        {alerts.map((alert) => (
          <li key={`${alert.projectId}-${alert.currentAt}`}>
            {onProjectSelect ? (
              <button
                type="button"
                onClick={() => onProjectSelect(alert.projectId)}
                className={`${dashAlertWarn} w-full text-left hover:bg-amber-100/80`}
              >
                <p className="font-medium">
                  {alert.projectName}
                  {alert.topic ? ` · ${alert.topic}` : ""}
                </p>
                <p className="mt-0.5 text-sm">
                  {alert.title} — verde ({formatRelativeDate(new Date(alert.previousAt))}) → rojo (
                  {formatRelativeDate(new Date(alert.currentAt))})
                </p>
              </button>
            ) : (
              <div className={dashAlertWarn}>
                <p className="font-medium">
                  {alert.projectName}
                  {alert.topic ? ` · ${alert.topic}` : ""}
                </p>
                <p className="mt-0.5 text-sm">
                  {alert.title} — verde ({formatRelativeDate(new Date(alert.previousAt))}) → rojo (
                  {formatRelativeDate(new Date(alert.currentAt))})
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
