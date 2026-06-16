import Link from "next/link";

import {
  ESCALOMETRO_HUB,
  PMO_ESCALATIONS,
  PMO_MEETINGS,
  ROI_MEETINGS_HUB,
} from "@/lib/dashboard-paths";
import { dashCard } from "@/lib/ui-classes";

type PmoPulseStripProps = {
  escalationCounts: { red: number; orange: number; green: number };
  meetingCounts: { bajo: number; moderado: number; alto: number; critico: number };
  totalMeetingCostMxn: number;
  formatMxn: (value: number) => string;
};

function SegmentedBar({
  segments,
}: {
  segments: { width: number; className: string; title: string }[];
}) {
  const total = segments.reduce((sum, s) => sum + s.width, 0);
  if (total === 0) {
    return <div className="h-2 rounded-full bg-slate-100" />;
  }
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
      {segments
        .filter((s) => s.width > 0)
        .map((s) => (
          <div
            key={s.title}
            className={s.className}
            style={{ width: `${s.width}%` }}
            title={s.title}
          />
        ))}
    </div>
  );
}

export function PmoPulseStrip({
  escalationCounts,
  meetingCounts,
  totalMeetingCostMxn,
  formatMxn,
}: PmoPulseStripProps) {
  const escTotal =
    escalationCounts.red + escalationCounts.orange + escalationCounts.green;
  const redPct = escTotal > 0 ? Math.round((escalationCounts.red / escTotal) * 100) : 0;
  const orangePct = escTotal > 0 ? Math.round((escalationCounts.orange / escTotal) * 100) : 0;
  const greenPct = escTotal > 0 ? 100 - redPct - orangePct : 0;

  const meetTotal =
    meetingCounts.bajo + meetingCounts.moderado + meetingCounts.alto + meetingCounts.critico;
  const criticoPct = meetTotal > 0 ? Math.round((meetingCounts.critico / meetTotal) * 100) : 0;
  const altoPct = meetTotal > 0 ? Math.round((meetingCounts.alto / meetTotal) * 100) : 0;
  const moderadoPct = meetTotal > 0 ? Math.round((meetingCounts.moderado / meetTotal) * 100) : 0;
  const bajoPct = meetTotal > 0 ? 100 - criticoPct - altoPct - moderadoPct : 0;

  return (
    <section className={`${dashCard} grid gap-4 p-4 md:grid-cols-2`}>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Pulso de escalamiento</h2>
            <p className="text-xs text-slate-500">Últimas evaluaciones del Escalómetro</p>
          </div>
          <div className="flex gap-2">
            <Link
              href={ESCALOMETRO_HUB}
              className="text-xs font-medium text-slate-600 underline hover:text-slate-900"
            >
              Evaluar
            </Link>
            <Link
              href={PMO_ESCALATIONS}
              className="text-xs font-medium text-slate-600 underline hover:text-slate-900"
            >
              Historial
            </Link>
          </div>
        </div>
        <div className="mt-3">
          <SegmentedBar
            segments={[
              { width: redPct, className: "bg-rose-500", title: `${escalationCounts.red} rojo` },
              {
                width: orangePct,
                className: "bg-amber-400",
                title: `${escalationCounts.orange} naranja`,
              },
              {
                width: greenPct,
                className: "bg-emerald-500",
                title: `${escalationCounts.green} verde`,
              },
            ]}
          />
          <p className="mt-2 text-xs text-slate-500">
            {escTotal > 0
              ? `${escalationCounts.red} rojo · ${escalationCounts.orange} naranja · ${escalationCounts.green} verde`
              : "Sin evaluaciones recientes"}
          </p>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Pulso de reuniones</h2>
            <p className="text-xs text-slate-500">Costo de sesiones · 30 días</p>
          </div>
          <div className="flex gap-2">
            <Link
              href={ROI_MEETINGS_HUB}
              className="text-xs font-medium text-slate-600 underline hover:text-slate-900"
            >
              Registrar
            </Link>
            <Link
              href={PMO_MEETINGS}
              className="text-xs font-medium text-slate-600 underline hover:text-slate-900"
            >
              Historial
            </Link>
          </div>
        </div>
        <div className="mt-3">
          <SegmentedBar
            segments={[
              { width: criticoPct, className: "bg-rose-500", title: `${meetingCounts.critico} críticas` },
              { width: altoPct, className: "bg-orange-500", title: `${meetingCounts.alto} altas` },
              {
                width: moderadoPct,
                className: "bg-amber-300",
                title: `${meetingCounts.moderado} moderadas`,
              },
              { width: bajoPct, className: "bg-emerald-500", title: `${meetingCounts.bajo} bajas` },
            ]}
          />
          <p className="mt-2 text-xs text-slate-500">
            {meetTotal > 0
              ? `${meetTotal} sesiones · ${formatMxn(totalMeetingCostMxn)} acumulado`
              : "Sin sesiones registradas"}
          </p>
        </div>
      </div>
    </section>
  );
}
