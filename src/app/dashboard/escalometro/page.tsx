/**
 * Super-Escalómetro: herramienta estática en /public/escalometro.html
 * (HTML/CSS/JS original) embebida para conservar el comportamiento sin duplicar lógica.
 */
export default function EscalometroPage() {
  return (
    <main className="flex min-h-[min(100vh,1200px)] flex-col gap-3">
      <iframe
        title="Super-Escalómetro de Proyectos"
        src="/escalometro.html"
        className="min-h-[920px] w-full flex-1 rounded-xl border border-slate-200 bg-[#f7f6f3] shadow-sm"
        sandbox="allow-scripts allow-same-origin"
      />
    </main>
  );
}
