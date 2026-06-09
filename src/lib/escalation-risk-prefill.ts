import type { EscalationDetailRecord } from "@/app/dashboard/pmo/escalation-detail-dialog";
import { getIndicatorLabel } from "@/lib/escalation-indicators";
import {
  parseEscalationActions,
  parseEscalationIndicators,
} from "@/lib/escalation-utils";
import { RISK_CATEGORIES } from "@/app/dashboard/risks/risk-utils";

export type RiskFormPrefill = {
  projectId: string;
  title: string;
  category: string;
  trigger: string;
  mitigation: string;
  probability: number;
  residualProb: number;
  impactAmount: number;
};

const INDICATOR_CATEGORY: Record<string, (typeof RISK_CATEGORIES)[number]> = {
  budget: "Financiero",
  schedule: "Operacional",
  team: "Recursos Humanos",
  scope: "Técnico",
  stakeholders: "Operacional",
  impact: "Regulatorio",
};

const TIER_RISK_DEFAULTS: Record<
  string,
  { probability: number; residualProb: number; impactAmount: number }
> = {
  red: { probability: 70, residualProb: 50, impactAmount: 120_000 },
  orange: { probability: 45, residualProb: 30, impactAmount: 60_000 },
  green: { probability: 25, residualProb: 15, impactAmount: 25_000 },
};

function pickCategory(indicators: Record<string, string>): string {
  const order = ["budget", "schedule", "team", "scope", "stakeholders", "impact"];
  for (const level of ["high", "medium"] as const) {
    for (const key of order) {
      if (indicators[key] === level) {
        return INDICATOR_CATEGORY[key] ?? "Operacional";
      }
    }
  }
  return "Operacional";
}

function buildRiskTitle(record: {
  title: string;
  topic: string | null;
  project: { name: string };
}): string {
  const topic = record.topic ? ` (${record.topic})` : "";
  return `[Escalómetro] ${record.project.name}${topic}: ${record.title}`;
}

export function buildRiskPrefillFromEscalation(record: {
  tier: string;
  title: string;
  topic: string | null;
  project: { id: string; name: string };
  indicators: Record<string, string>;
  actions: string[];
}): RiskFormPrefill {
  const defaults = TIER_RISK_DEFAULTS[record.tier] ?? TIER_RISK_DEFAULTS.orange;
  const criticalIndicators = Object.entries(record.indicators)
    .filter(([, level]) => level === "high" || level === "medium")
    .map(([key, level]) => `${getIndicatorLabel(key)} (${level === "high" ? "alto" : "medio"})`);

  return {
    projectId: record.project.id,
    title: buildRiskTitle(record),
    category: pickCategory(record.indicators),
    trigger:
      criticalIndicators.length > 0
        ? `Señales del escalómetro: ${criticalIndicators.join("; ")}`
        : record.title,
    mitigation: record.actions.slice(0, 4).join("\n"),
    probability: defaults.probability,
    residualProb: defaults.residualProb,
    impactAmount: defaults.impactAmount,
  };
}

export function riskPrefillSearchParams(prefill: RiskFormPrefill): string {
  const params = new URLSearchParams();
  params.set("prefill", "1");
  params.set("projectId", prefill.projectId);
  params.set("title", prefill.title);
  params.set("category", prefill.category);
  params.set("trigger", prefill.trigger);
  params.set("mitigation", prefill.mitigation);
  params.set("probability", String(prefill.probability));
  params.set("residualProb", String(prefill.residualProb));
  params.set("impactAmount", String(prefill.impactAmount));
  return params.toString();
}

export function riskFromEscalationUrl(record: EscalationDetailRecord): string {
  return `/dashboard/risks?${riskPrefillSearchParams(buildRiskPrefillFromEscalation(record))}`;
}

export function parseRiskPrefillFromSearchParams(
  params: Record<string, string | undefined>,
): RiskFormPrefill | null {
  if (params.prefill !== "1" || !params.projectId || !params.title) return null;
  return {
    projectId: params.projectId,
    title: params.title,
    category: params.category ?? "Operacional",
    trigger: params.trigger ?? "",
    mitigation: params.mitigation ?? "",
    probability: Number(params.probability ?? 45),
    residualProb: Number(params.residualProb ?? 25),
    impactAmount: Number(params.impactAmount ?? 50_000),
  };
}
