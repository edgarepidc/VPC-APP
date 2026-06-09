import { getQuadrantId } from "@/lib/stakeholder-playbook";

export type StakeholderActionKind =
  | "promoter_no_obs"
  | "high_influence_no_obs"
  | "project_no_promoters"
  | "project_empty";

export type StakeholderActionRow = {
  id: string;
  name: string;
  role: string | null;
  influence: number;
  interest: number;
  observation: string | null;
  project: { id: string; name: string };
};

export type StakeholderActionItem = {
  id: string;
  label: string;
  sublabel: string;
  stakeholderId: string | null;
  projectId: string;
  kinds: StakeholderActionKind[];
  priority: number;
};

const kindRank: Record<StakeholderActionKind, number> = {
  project_empty: 0,
  project_no_promoters: 1,
  promoter_no_obs: 2,
  high_influence_no_obs: 3,
};

const kindLabels: Record<StakeholderActionKind, string> = {
  project_empty: "Sin interesados",
  project_no_promoters: "Sin promotores",
  promoter_no_obs: "Promotor sin nota",
  high_influence_no_obs: "Alta influencia sin nota",
};

export function stakeholderActionKindLabel(kind: StakeholderActionKind) {
  return kindLabels[kind];
}

export function buildStakeholderActionItems(
  rows: StakeholderActionRow[],
  projects: { id: string; name: string }[],
): StakeholderActionItem[] {
  const items: StakeholderActionItem[] = [];

  for (const row of rows) {
    const kinds: StakeholderActionKind[] = [];
    const q = getQuadrantId(row.influence, row.interest);
    if (q === "q1" && !row.observation?.trim()) kinds.push("promoter_no_obs");
    else if (row.influence >= 7 && !row.observation?.trim()) kinds.push("high_influence_no_obs");
    if (kinds.length === 0) continue;
    items.push({
      id: `sh-${row.id}`,
      label: row.name,
      sublabel: row.project.name,
      stakeholderId: row.id,
      projectId: row.project.id,
      kinds,
      priority: Math.min(...kinds.map((k) => kindRank[k])),
    });
  }

  for (const project of projects) {
    const projectRows = rows.filter((r) => r.project.id === project.id);
    if (projectRows.length === 0) {
      items.push({
        id: `proj-empty-${project.id}`,
        label: project.name,
        sublabel: "Proyecto sin interesados",
        stakeholderId: null,
        projectId: project.id,
        kinds: ["project_empty"],
        priority: kindRank.project_empty,
      });
      continue;
    }
    const hasPromoter = projectRows.some((r) => getQuadrantId(r.influence, r.interest) === "q1");
    if (!hasPromoter) {
      items.push({
        id: `proj-noprom-${project.id}`,
        label: project.name,
        sublabel: "Sin jugadores clave (Q1)",
        stakeholderId: null,
        projectId: project.id,
        kinds: ["project_no_promoters"],
        priority: kindRank.project_no_promoters,
      });
    }
  }

  return items.sort((a, b) => a.priority - b.priority).slice(0, 12);
}
