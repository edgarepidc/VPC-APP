import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import { dashCard, dashPage } from "@/lib/ui-classes";

export default function RoiMeetingsPage() {
  return (
    <main className={dashPage}>
      <DashboardPageHeader
        title="ROI de reuniones"
        description="Calcula el retorno de inversión de tus sesiones de trabajo."
      />

      <section className={`${dashCard} overflow-hidden p-0`}>
        <iframe
          title="ROI de Reuniones"
          src="/roi-meetings.html"
          className="min-h-[820px] w-full flex-1 rounded-lg border-0 bg-slate-50"
          sandbox="allow-scripts allow-same-origin"
        />
      </section>
    </main>
  );
}
