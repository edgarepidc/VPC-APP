import type { ReactNode } from "react";

const SEGMENT_COLS = [
  "bg-[#5a7fc4]",
  "bg-[#c9a46c]",
  "bg-[#4a9d8f]",
  "bg-[#9b7ed9]",
  "bg-[#6b8cae]",
  "bg-[#c97b84]",
  "bg-[#7a9e6f]",
  "bg-[#8b7d6b]",
] as const;

export function KpiCard({
  label,
  value,
  hint,
  icon,
  accent = "navy",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: ReactNode;
  accent?: "navy" | "emerald" | "sky";
}) {
  const border =
    accent === "emerald"
      ? "border-emerald-200/80"
      : accent === "sky"
        ? "border-sky-200/80"
        : "border-slate-200/90";
  const glow =
    accent === "emerald"
      ? "from-emerald-500/12 via-white to-white"
      : accent === "sky"
        ? "from-sky-500/12 via-white to-white"
        : "from-[#0f1f5c]/10 via-white to-white";

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border ${border} bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.03] transition duration-200 hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${glow} opacity-0 transition group-hover:opacity-100`}
        aria-hidden
      />
      <div className="relative flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-900/[0.06] text-[#0f1f5c] ring-1 ring-slate-900/8">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-[12px] leading-snug text-slate-500">{hint}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function PlanDistributionPanel({
  counts,
  title = "Distribución por plan",
}: {
  counts: Record<string, number>;
  title?: string;
}) {
  const entries = Object.entries(counts).filter(([, n]) => n > 0);
  const max = Math.max(...entries.map(([, n]) => n), 1);
  const total = entries.reduce((s, [, n]) => s + n, 0);

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-5 text-center text-sm text-slate-500">
        Sin datos de planes en esta vista.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.04]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
          {total} org.
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {entries.map(([plan, n], i) => (
          <div key={plan}>
            <div className="mb-1 flex justify-between text-[12px]">
              <span className="font-medium capitalize text-slate-700">{plan}</span>
              <span className="tabular-nums text-slate-500">
                {n}{" "}
                <span className="text-slate-400">
                  ({Math.round((n / total) * 100)}%)
                </span>
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${SEGMENT_COLS[i % SEGMENT_COLS.length]}`}
                style={{ width: `${(n / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <details className="group mt-4 border-t border-slate-100 pt-3">
        <summary className="cursor-pointer list-none text-[12px] font-medium text-[#0f1f5c] outline-none marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="underline decoration-[#0f1f5c]/30 underline-offset-2 group-open:decoration-[#0f1f5c]">
            Cómo leer este gráfico
          </span>
        </summary>
        <p className="mt-2 text-[12px] leading-relaxed text-slate-600">
          Cada barra compara el volumen de organizaciones por plan frente al plan
          con más clientes en esta vista. Útil para ver concentración Starter / Pro
          / Enterprise de un vistazo.
        </p>
      </details>
    </div>
  );
}

export function TenantProjectShareBar({
  tenants,
  title = "Proyectos por organización (vista actual)",
}: {
  tenants: { id: string; name: string; slug: string; projects: number }[];
  title?: string;
}) {
  const sorted = [...tenants]
    .filter((t) => t.projects > 0)
    .sort((a, b) => b.projects - a.projects)
    .slice(0, 10);

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-5 text-center text-sm text-slate-500">
        Aún no hay proyectos registrados en las organizaciones de esta vista.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.04]">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-[12px] text-slate-500">
        Franjas proporcionales a proyectos; hasta 10 organizaciones con más
        carga en esta lista.
      </p>
      <div
        className="mt-4 flex h-4 overflow-hidden rounded-full ring-1 ring-slate-900/10"
        role="img"
        aria-label="Distribución de proyectos entre organizaciones"
      >
        {sorted.map((t, i) => (
          <div
            key={t.id}
            style={{ flex: t.projects }}
            className={`${SEGMENT_COLS[i % SEGMENT_COLS.length]} min-w-px transition-[flex] duration-500`}
            title={`${t.name}: ${t.projects} proyectos`}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-600">
        {sorted.slice(0, 6).map((t, i) => (
          <li key={t.id} className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 shrink-0 rounded-sm ${SEGMENT_COLS[i % SEGMENT_COLS.length]}`}
            />
            <span className="max-w-[140px] truncate font-medium text-slate-700">
              {t.name}
            </span>
            <span className="tabular-nums text-slate-400">({t.projects})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InvitationStatusDonut({
  pending,
  accepted,
}: {
  pending: number;
  accepted: number;
}) {
  const sum = pending + accepted;
  const acceptedDeg = sum === 0 ? 0 : (accepted / sum) * 360;

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.04]">
      <h3 className="text-sm font-semibold text-slate-900">Estado de invitaciones</h3>
      <p className="mt-1 text-[12px] text-slate-500">
        Totales en base de datos (no solo la tabla de 50 filas).
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-6">
        <div
          className="relative h-28 w-28 shrink-0 rounded-full shadow-inner ring-2 ring-white"
          style={{
            background:
              sum === 0
                ? "conic-gradient(rgb(226 232 240) 0deg 360deg)"
                : `conic-gradient(rgb(16 185 129) 0deg ${acceptedDeg}deg, rgb(226 232 240) ${acceptedDeg}deg 360deg)`,
          }}
          role="img"
          aria-label={`Aceptadas ${accepted}, pendientes ${pending}`}
        >
          <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-white text-center shadow-sm">
            <span className="text-lg font-bold tabular-nums text-slate-900">{sum}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
              Total
            </span>
          </div>
        </div>
        <dl className="grid flex-1 gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
              Aceptadas
            </dt>
            <dd className="text-xl font-semibold tabular-nums text-emerald-950">
              {accepted}
            </dd>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              Pendientes
            </dt>
            <dd className="text-xl font-semibold tabular-nums text-slate-900">
              {pending}
            </dd>
          </div>
        </dl>
      </div>
      <details className="group mt-4 border-t border-slate-100 pt-3">
        <summary className="cursor-pointer list-none text-[12px] font-medium text-[#0f1f5c] outline-none marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="underline decoration-[#0f1f5c]/30 underline-offset-2">
            Detalle operativo
          </span>
        </summary>
        <ul className="mt-2 list-inside list-disc space-y-1 text-[12px] text-slate-600">
          <li>
            Las <strong>aceptadas</strong> ya generaron membresía al iniciar sesión
            el invitado.
          </li>
          <li>
            Las <strong>pendientes</strong> esperan primer login o correo aún sin
            abrir.
          </li>
        </ul>
      </details>
    </div>
  );
}

export function IconOrg() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20V9l8-4 8 4v11"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function IconProjects() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16v10H4z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M8 11h8M8 14h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconPeople() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4 19c0-3 2.5-4 5-4s5 1 5 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="16" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M20 19c0-2.5-1.5-3.5-4-3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconMail() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16v10H4z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M4 8l8 5 8-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
