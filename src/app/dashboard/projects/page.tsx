import { redirect } from "next/navigation";

import { PMO_PROJECTS } from "@/lib/dashboard-paths";

export default function LegacyProjectsRedirect() {
  redirect(PMO_PROJECTS);
}
