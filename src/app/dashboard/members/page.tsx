import { redirect } from "next/navigation";

import { PMO_TEAM } from "@/lib/dashboard-paths";

export default function LegacyMembersRedirect() {
  redirect(PMO_TEAM);
}
