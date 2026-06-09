/**
 * ROI de reuniones: herramienta estática en /public/roi-meetings.html.
 */
export default function RoiMeetingsPage() {
  return (
    <main className="flex min-h-[min(100vh,1200px)] flex-col gap-3">
      <iframe
        title="ROI de Reuniones — Calculadora de Inversión"
        src="/roi-meetings.html"
        className="min-h-[920px] w-full flex-1 rounded-xl border border-slate-200 bg-[#f9f9f8] shadow-sm"
        sandbox="allow-scripts allow-same-origin"
      />
    </main>
  );
}
