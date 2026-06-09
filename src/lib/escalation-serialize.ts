import type { EscalationDetailRecord } from "@/app/dashboard/pmo/escalation-detail-dialog";
import {
  parseEscalationActions,
  parseEscalationIndicators,
} from "@/lib/escalation-utils";

type EscalationCheckLike = {
  id: string;
  tier: string;
  title: string;
  levelLabel: string;
  topic: string | null;
  indicators: unknown;
  actions: unknown;
  createdAt: Date;
  project: { id: string; name: string };
};

export function serializeEscalationCheck(
  check: EscalationCheckLike,
): EscalationDetailRecord {
  return {
    id: check.id,
    tier: check.tier,
    title: check.title,
    levelLabel: check.levelLabel,
    topic: check.topic,
    indicators: parseEscalationIndicators(check.indicators),
    actions: parseEscalationActions(check.actions),
    createdAt: check.createdAt.toISOString(),
    project: check.project,
  };
}

export function serializeEscalationChecks(
  checks: EscalationCheckLike[],
): EscalationDetailRecord[] {
  return checks.map(serializeEscalationCheck);
}
