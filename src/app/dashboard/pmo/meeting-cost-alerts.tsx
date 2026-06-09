import Link from "next/link";

import { PMO_MEETINGS } from "@/lib/dashboard-paths";
import { formatMxn } from "@/lib/meeting-roi-utils";
import { formatRelativeDate } from "@/lib/escalation-utils";
import { dashAlertWarn, dashCard } from "@/lib/ui-classes";

export type MeetingCostAlertRow = {
  projectId: string;
  projectName: string;
  sessionName: string | null;
  costLevel: string;
  totalCost: number;
  diagnosisTitle: string;
  createdAt: string;
  alertType: "critical" | "inefficient" | "spike";
};

const ALERT_COPY: Record<MeetingCostAlertRow["alertType"], string> = {
  critical: "Sesión crítica",
  inefficient: "Sesión informativa costosa",
  spike: "Salto de costo",
};

type MeetingCostAlertsProps = {
  alerts: MeetingCostAlertRow[];
};

export function MeetingCostAlerts({ alerts }: MeetingCostAlertsProps) {
  if (alerts.length === 0) return null;

  return (
    <section className={`${dashCard} border-rose-200 bg-rose-50/40 p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-rose-950">Alertas de costo de reuniones</h2>
          <p className="mt-1 text-sm text-rose-900/80">
            Sesiones críticas, ineficientes o con salto de costo en los últimos 7 días.
          </p>
        </div>
        <Link
          href={PMO_MEETINGS}
          className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm font-medium text-rose-950 hover:bg-rose-50"
        >
          Ver reuniones
        </Link>
      </div>
      <ul className="mt-3 space-y-2">
        {alerts.slice(0, 6).map((alert) => (
          <li key={`${alert.projectId}-${alert.alertType}-${alert.createdAt}`} className={dashAlertWarn}>
            <p className="font-medium">
              {alert.projectName}
              {alert.sessionName ? ` · ${alert.sessionName}` : ""}
              <span className="ml-1 text-xs font-normal text-rose-800">
                ({ALERT_COPY[alert.alertType]})
              </span>
            </p>
            <p className="mt-0.5 text-sm">
              {alert.diagnosisTitle} — {formatMxn(alert.totalCost)} ·{" "}
              {formatRelativeDate(new Date(alert.createdAt))}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
