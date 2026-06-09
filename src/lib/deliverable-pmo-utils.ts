import { isDeliverableDoneStatus } from "@/modules/deliverables/constants";

export type DeliverableMetricRow = {
  id: string;
  projectId: string;
  status: string;
  weight: number;
  dueDate: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function weightedProgressPct(rows: DeliverableMetricRow[]): number {
  if (rows.length === 0) return 0;
  const sum = rows.reduce((acc, r) => acc + r.weight, 0);
  const scale = sum > 0 ? 100 / sum : 1;
  const done = rows
    .filter((r) => isDeliverableDoneStatus(r.status))
    .reduce((acc, r) => acc + r.weight * scale, 0);
  return Math.round(done);
}

export function onTimeDeliveryPct(rows: DeliverableMetricRow[]): number | null {
  const closed = rows.filter(
    (r) => isDeliverableDoneStatus(r.status) && r.deliveredAt && r.dueDate,
  );
  if (closed.length === 0) return null;
  let onTime = 0;
  for (const r of closed) {
    const dueEnd = startOfDay(r.dueDate!);
    dueEnd.setHours(23, 59, 59, 999);
    if (r.deliveredAt!.getTime() <= dueEnd.getTime()) onTime += 1;
  }
  return Math.round((onTime / closed.length) * 100);
}

export function averageLeadTimeDays(rows: DeliverableMetricRow[]): number | null {
  const closed = rows.filter((r) => isDeliverableDoneStatus(r.status) && r.deliveredAt);
  if (closed.length === 0) return null;
  const total = closed.reduce((sum, r) => {
    const days = Math.round(
      (startOfDay(r.deliveredAt!).getTime() - startOfDay(r.createdAt).getTime()) / 86400000,
    );
    return sum + Math.max(0, days);
  }, 0);
  return Math.round(total / closed.length);
}

export type WeeklyDeliverableTrend = {
  label: string;
  completed: number;
  overdue: number;
};

export function buildWeeklyDeliverableTrend(
  rows: DeliverableMetricRow[],
  weeks = 4,
): WeeklyDeliverableTrend[] {
  const out: WeeklyDeliverableTrend[] = [];
  const now = startOfDay(new Date());

  for (let w = weeks - 1; w >= 0; w -= 1) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - w * 7 - 6);
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - w * 7);
    weekEnd.setHours(23, 59, 59, 999);

    let completed = 0;
    let overdue = 0;
    for (const r of rows) {
      if (r.deliveredAt && r.deliveredAt >= weekStart && r.deliveredAt <= weekEnd) {
        completed += 1;
      }
      if (
        r.dueDate &&
        r.dueDate >= weekStart &&
        r.dueDate <= weekEnd &&
        !isDeliverableDoneStatus(r.status) &&
        r.dueDate < now
      ) {
        overdue += 1;
      }
    }

    out.push({
      label: weekStart.toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
      completed,
      overdue,
    });
  }
  return out;
}
