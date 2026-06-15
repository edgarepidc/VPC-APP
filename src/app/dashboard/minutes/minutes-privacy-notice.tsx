type MinutesPrivacyNoticeProps = {
  compact?: boolean;
  className?: string;
};

export function MinutesPrivacyNotice({ compact = false, className = "" }: MinutesPrivacyNoticeProps) {
  return (
    <aside
      className={`rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/60 px-4 py-3 text-sm text-slate-700 shadow-sm ${className}`}
      aria-label="Aviso de privacidad y seguridad"
    >
      <div className="flex gap-3">
        <span
          className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-base"
          aria-hidden
        >
          🔒
        </span>
        <div className="min-w-0 space-y-1">
          <p className="font-semibold text-indigo-950">
            {compact ? "Privacidad" : "Privacidad y confidencialidad"}
          </p>
          <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
            La transcripción o el archivo Word{" "}
            <strong className="font-medium text-slate-800">no se guardan</strong> en la base de
            datos: solo se usan en memoria para generar la minuta y se descartan al terminar. La
            minuta final queda visible únicamente para usuarios autorizados de tu workspace. El
            procesamiento con IA se realiza a través de Vercel AI Gateway; no compartimos tu
            contenido con otros clientes ni lo usamos para entrenar modelos.
          </p>
        </div>
      </div>
    </aside>
  );
}
