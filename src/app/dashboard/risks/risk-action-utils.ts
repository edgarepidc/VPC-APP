import { residualScore } from "./risk-utils";

export type RiskActionKind = "critical" | "no_plan_b" | "expired" | "due_soon";

export type RiskActionRow = {
  id: string;
  title: string;
  project: { id: string; name: string };
  residualProb: number;
  impactAmount: number;
  contingency: string | null;
  dueDate: string | null;
};

export type RiskActionItem = {
  row: RiskActionRow;
  kinds: RiskActionKind[];
  priority: number;
};

const kindRank: Record<RiskActionKind, number> = {
  critical: 0,
  no_plan_b: 1,
  expired: 2,
  due_soon: 3,
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function buildRiskActionItems(rows: RiskActionRow[]): RiskActionItem[] {
  const today = startOfToday();
  const items: RiskActionItem[] = [];

  for (const row of rows) {
    const score = residualScore(row.residualProb, row.impactAmount);
    const kinds: RiskActionKind[] = [];
    if (score > 10) kinds.push("critical");
    if (score > 10 && !row.contingency?.trim()) kinds.push("no_plan_b");
    if (row.dueDate) {
      const due = new Date(row.dueDate);
      if (due < today) kinds.push("expired");
      else {
        const days = Math.round((due.getTime() - today.getTime()) / 86400000);
        if (days <= 14) kinds.push("due_soon");
      }
    }
    if (kinds.length === 0) continue;
    items.push({
      row,
      kinds,
      priority: Math.min(...kinds.map((k) => kindRank[k])),
    });
  }

  return items.sort((a, b) => a.priority - b.priority).slice(0, 12);
}
