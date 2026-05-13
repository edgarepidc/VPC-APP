import type { ReactNode } from "react";

const SEGMENT_COLS = [
  "bg-[#0f1f5c]",
  "bg-[#c9a46c]",
  "bg-[#2a4a7a]",
  "bg-[#d4b896]",
  "bg-[#1a3052]",
  "bg-[#a67c52]",
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
  accent?: "navy" | "tan" | "steel";
}) {
  const border =
    accent === "tan"
      ? "border-[#c9a46c]/45"
      : accent === "steel"
        ? "border-[#2a4a7a]/35"
        : "border-[#e3d6c4]";
  const glow =
    accent === "tan"
      ? "from-[#c9a46c]/18 via-white to-white"
      : accent === "steel"
        ? "from-[#2a4a7a]/14 via-white to-white"
        : "from-[#0f1f5c]/10 via-[#faf6ef] to-white";

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border ${border} bg-[linear-gradient(145deg,#ffffff_0%,#faf8f4_100%)] p-4 shadow-sm ring-1 ring-[#0f1f5c]/[0.05] transition duration-200 hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${glow} opacity-0 transition group-hover:opacity-100`}
        aria-hidden
      />
      <div className="relative flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0f1f5c]/12 via-[#faf6ef] to-[#c9a46c]/25 text-[#0f1f5c] ring-1 ring-[#c9a46c]/35">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b5c48]">
            {label}
          </p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-[#0f1f5c]">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-[12px] leading-snug text-[#5c6573]">{hint}</p>
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
      <div className="rounded-xl border border-dashed border-[#d4c4b0] bg-[#faf8f4]/90 p-5 text-center text-sm text-[#6b5c48]">
        Sin datos de planes en esta vista.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#e3d6c4] bg-[linear-gradient(160deg,#ffffff_0%,#faf8f4_100%)] p-5 shadow-sm ring-1 ring-[#0f1f5c]/[0.04]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#0f1f5c]">{title}</h3>
        <span className="rounded-full border border-[#c9a46c]/35 bg-[#0f1f5c]/[0.06] px-2.5 py-0.5 text-[11px] font-semibold text-[#0f1f5c]">
          {total} org.
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {entries.map(([plan, n], i) => (
          <div key={plan}>
            <div className="mb-1 flex justify-between text-[12px]">
              <span className="font-medium capitalize text-[#0f1f5c]">{plan}</span>
              <span className="tabular-nums text-[#5c6573]">
                {n}{" "}
                <span className="text-[#9a8b78]">
                  ({Math.round((n / total) * 100)}%)
                </span>
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#ece4d6]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${SEGMENT_COLS[i % SEGMENT_COLS.length]}`}
                style={{ width: `${(n / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <details className="group mt-4 border-t border-[#e8dfd0] pt-3">
        <summary className="cursor-pointer list-none text-[12px] font-medium text-[#0f1f5c] outline-none marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="underline decoration-[#c9a46c]/50 underline-offset-2 group-open:decoration-[#c9a46c]">
            Cómo leer este gráfico
          </span>
        </summary>
        <p className="mt-2 text-[12px] leading-relaxed text-[#5c6573]">
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
      <div className="rounded-xl border border-dashed border-[#d4c4b0] bg-[#faf8f4]/90 p-5 text-center text-sm text-[#6b5c48]">
        Aún no hay proyectos registrados en las organizaciones de esta vista.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#e3d6c4] bg-[linear-gradient(160deg,#ffffff_0%,#faf8f4_100%)] p-5 shadow-sm ring-1 ring-[#0f1f5c]/[0.04]">
      <h3 className="text-sm font-semibold text-[#0f1f5c]">{title}</h3>
      <p className="mt-1 text-[12px] text-[#5c6573]">
        Franjas proporcionales a proyectos; hasta 10 organizaciones con más
        carga en esta lista.
      </p>
      <div
        className="mt-4 flex h-4 overflow-hidden rounded-full ring-1 ring-[#c9a46c]/25"
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
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-[#5c6573]">
        {sorted.slice(0, 6).map((t, i) => (
          <li key={t.id} className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 shrink-0 rounded-sm ${SEGMENT_COLS[i % SEGMENT_COLS.length]}`}
            />
            <span className="max-w-[140px] truncate font-medium text-[#0f1f5c]">
              {t.name}
            </span>
            <span className="tabular-nums text-[#8a7d6f]">({t.projects})</span>
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
    <div className="rounded-xl border border-[#e3d6c4] bg-[linear-gradient(160deg,#ffffff_0%,#faf8f4_100%)] p-5 shadow-sm ring-1 ring-[#0f1f5c]/[0.04]">
      <h3 className="text-sm font-semibold text-[#0f1f5c]">Estado de invitaciones</h3>
      <p className="mt-1 text-[12px] text-[#5c6573]">
        Totales en base de datos (no solo la tabla de 50 filas).
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-6">
        <div
          className="relative h-28 w-28 shrink-0 rounded-full shadow-inner ring-2 ring-white"
          style={{
            background:
              sum === 0
                ? "conic-gradient(#e8dfd0 0deg 360deg)"
                : `conic-gradient(#c9a46c 0deg ${acceptedDeg}deg, #e8dfd0 ${acceptedDeg}deg 360deg)`,
          }}
          role="img"
          aria-label={`Aceptadas ${accepted}, pendientes ${pending}`}
        >
          <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-white text-center shadow-sm ring-1 ring-[#c9a46c]/20">
            <span className="text-lg font-bold tabular-nums text-[#0f1f5c]">{sum}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wide text-[#8a7d6f]">
              Total
            </span>
          </div>
        </div>
        <dl className="grid flex-1 gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-[#c9a46c]/45 bg-[#faf5eb] px-3 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#6b4f2a]">
              Aceptadas
            </dt>
            <dd className="text-xl font-semibold tabular-nums text-[#0f1f5c]">
              {accepted}
            </dd>
          </div>
          <div className="rounded-lg border border-[#cfd8e6] bg-[#f4f6f9] px-3 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#4a5560]">
              Pendientes
            </dt>
            <dd className="text-xl font-semibold tabular-nums text-[#0f1f5c]">
              {pending}
            </dd>
          </div>
        </dl>
      </div>
      <details className="group mt-4 border-t border-[#e8dfd0] pt-3">
        <summary className="cursor-pointer list-none text-[12px] font-medium text-[#0f1f5c] outline-none marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="underline decoration-[#c9a46c]/50 underline-offset-2">
            Detalle operativo
          </span>
        </summary>
        <ul className="mt-2 list-inside list-disc space-y-1 text-[12px] text-[#5c6573]">
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
