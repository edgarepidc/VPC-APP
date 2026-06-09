import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import { dashCard, dashPage } from "@/lib/ui-classes";

export default function EscalometroPage() {
  return (
    <main className={dashPage}>
      <DashboardPageHeader
        title="Escalómetro"
        description="Herramienta de priorización y escalamiento de proyectos."
      />

      <section className={`${dashCard} overflow-hidden p-0`}>
        <iframe
          title="Super-Escalómetro de Proyectos"
          src="/escalometro.html"
          className="min-h-[820px] w-full flex-1 rounded-lg border-0 bg-slate-50"
          sandbox="allow-scripts allow-same-origin"
        />
      </section>
    </main>
  );
}
