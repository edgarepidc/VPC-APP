import type { ReactNode } from "react";

/** Hero / tarjetas KPI: mismo degradado que el bloque superior de /admin. */
export function VpcAdminGradientShell({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-[#c9a46c]/40 bg-gradient-to-br from-[#0f1f5c] via-[#152d4f] to-[#261c16] text-white shadow-[0_16px_48px_-18px_rgba(15,31,92,0.45)] ring-1 ring-white/10 ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_88%_8%,rgba(201,164,108,0.22),transparent_52%)]"
        aria-hidden
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/** Marco degradado con interior claro: tablas, formularios largos, listas. */
export function VpcAdminInsetShell({
  className = "",
  innerClassName = "",
  children,
}: {
  className?: string;
  innerClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl bg-gradient-to-br from-[#0f1f5c] via-[#1a3052] to-[#3d2918] p-[1px] shadow-[0_14px_40px_-18px_rgba(15,31,92,0.38)] ring-1 ring-[#c9a46c]/30 ${className}`}
    >
      <div
        className={`rounded-[11px] bg-[linear-gradient(168deg,#ffffff_0%,#faf8f4_52%,#f2e8da_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-[#0f1f5c]/[0.06] ${innerClassName}`}
      >
        {children}
      </div>
    </div>
  );
}

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
  const ringIcon =
    accent === "tan"
      ? "ring-[#c9a46c]/50 bg-white/10 text-[#f5e6c8]"
      : accent === "steel"
        ? "ring-[#8fb4e0]/35 bg-white/10 text-[#dce8f8]"
        : "ring-white/25 bg-white/10 text-white";

  return (
    <VpcAdminGradientShell className="p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_52px_-16px_rgba(15,31,92,0.55)]">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${ringIcon}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">
            {label}
          </p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-white">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-[12px] leading-snug text-white/70">{hint}</p>
          ) : null}
        </div>
      </div>
    </VpcAdminGradientShell>
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
      <VpcAdminGradientShell className="p-5 text-center text-sm text-white/70">
        Sin datos de planes en esta vista.
      </VpcAdminGradientShell>
    );
  }

  return (
    <VpcAdminGradientShell className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#f5e6c8] ring-1 ring-[#c9a46c]/35">
          {total} org.
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {entries.map(([plan, n], i) => (
          <div key={plan}>
            <div className="mb-1 flex justify-between text-[12px]">
              <span className="font-medium capitalize text-white/95">{plan}</span>
              <span className="tabular-nums text-white/75">
                {n}{" "}
                <span className="text-white/50">
                  ({Math.round((n / total) * 100)}%)
                </span>
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/15 ring-1 ring-white/10">
              <div
                className={`h-full rounded-full transition-all duration-500 ${SEGMENT_COLS[i % SEGMENT_COLS.length]}`}
                style={{ width: `${(n / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <details className="group mt-4 border-t border-white/15 pt-3">
        <summary className="cursor-pointer list-none text-[12px] font-medium text-[#f0d9b0] outline-none marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="underline decoration-[#c9a46c]/60 underline-offset-2 group-open:decoration-[#c9a46c]">
            Cómo leer este gráfico
          </span>
        </summary>
        <p className="mt-2 text-[12px] leading-relaxed text-white/70">
          Cada barra compara el volumen de organizaciones por plan frente al plan
          con más clientes en esta vista. Útil para ver concentración Starter / Pro
          / Enterprise de un vistazo.
        </p>
      </details>
    </VpcAdminGradientShell>
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
      <VpcAdminGradientShell className="p-5 text-center text-sm text-white/70">
        Aún no hay proyectos registrados en las organizaciones de esta vista.
      </VpcAdminGradientShell>
    );
  }

  return (
    <VpcAdminGradientShell className="p-5">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1 text-[12px] text-white/70">
        Franjas proporcionales a proyectos; hasta 10 organizaciones con más
        carga en esta lista.
      </p>
      <div
        className="mt-4 flex h-4 overflow-hidden rounded-full ring-2 ring-white/20"
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
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-white/75">
        {sorted.slice(0, 6).map((t, i) => (
          <li key={t.id} className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 shrink-0 rounded-sm ${SEGMENT_COLS[i % SEGMENT_COLS.length]}`}
            />
            <span className="max-w-[140px] truncate font-medium text-white">
              {t.name}
            </span>
            <span className="tabular-nums text-white/50">({t.projects})</span>
          </li>
        ))}
      </ul>
    </VpcAdminGradientShell>
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
    <VpcAdminGradientShell className="p-5">
      <h3 className="text-sm font-semibold text-white">Estado de invitaciones</h3>
      <p className="mt-1 text-[12px] text-white/70">
        Totales en base de datos (no solo la tabla de 50 filas).
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-6">
        <div
          className="relative h-28 w-28 shrink-0 rounded-full shadow-inner ring-2 ring-white/30"
          style={{
            background:
              sum === 0
                ? "conic-gradient(rgba(255,255,255,0.2) 0deg 360deg)"
                : `conic-gradient(#c9a46c 0deg ${acceptedDeg}deg, rgba(255,255,255,0.18) ${acceptedDeg}deg 360deg)`,
          }}
          role="img"
          aria-label={`Aceptadas ${accepted}, pendientes ${pending}`}
        >
          <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-[linear-gradient(165deg,#ffffff_0%,#f4ebe0_100%)] text-center shadow-md ring-1 ring-[#c9a46c]/35">
            <span className="text-lg font-bold tabular-nums text-[#0f1f5c]">{sum}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wide text-[#6b5c48]">
              Total
            </span>
          </div>
        </div>
        <dl className="grid flex-1 gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-[#c9a46c]/40 bg-white/10 px-3 py-2 ring-1 ring-white/10">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#f0d9b0]">
              Aceptadas
            </dt>
            <dd className="text-xl font-semibold tabular-nums text-white">{accepted}</dd>
          </div>
          <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 ring-1 ring-white/10">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-white/60">
              Pendientes
            </dt>
            <dd className="text-xl font-semibold tabular-nums text-white">{pending}</dd>
          </div>
        </dl>
      </div>
      <details className="group mt-4 border-t border-white/15 pt-3">
        <summary className="cursor-pointer list-none text-[12px] font-medium text-[#f0d9b0] outline-none marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="underline decoration-[#c9a46c]/60 underline-offset-2">
            Detalle operativo
          </span>
        </summary>
        <ul className="mt-2 list-inside list-disc space-y-1 text-[12px] text-white/75">
          <li>
            Las <strong className="text-white">aceptadas</strong> ya generaron membresía al iniciar sesión
            el invitado.
          </li>
          <li>
            Las <strong className="text-white">pendientes</strong> esperan primer login o correo aún sin
            abrir.
          </li>
        </ul>
      </details>
    </VpcAdminGradientShell>
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
