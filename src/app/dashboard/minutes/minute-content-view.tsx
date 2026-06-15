"use client";

import type { MeetingMinuteContent } from "@/lib/meeting-minute-types";

type MinuteContentViewProps = {
  content: MeetingMinuteContent;
  className?: string;
};

export function MinuteContentView({ content, className = "" }: MinuteContentViewProps) {
  return (
    <div className={`space-y-5 ${className}`}>
      <section className="overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-sm">
        <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 px-4 py-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-800">
            Resumen ejecutivo
          </h2>
        </div>
        <p className="px-4 py-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
          {content.summary}
        </p>
      </section>

      {content.topics.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-violet-700">
            Puntos tratados
          </h2>
          {content.topics.map((topic, index) => (
            <article
              key={`${topic.title}-${index}`}
              className="overflow-hidden rounded-xl border border-violet-100 bg-white shadow-sm"
            >
              <div className="border-l-4 border-violet-400 px-4 py-3">
                <h3 className="font-medium text-slate-900">{topic.title}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {topic.description}
                </p>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm">
        <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
            Acuerdos y tareas de seguimiento
          </h2>
        </div>
        {content.actionItems.length === 0 ? (
          <p className="px-4 py-3 text-sm text-slate-600">
            No se identificaron acuerdos en la sesión.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-emerald-50/80 text-left text-xs font-semibold uppercase tracking-wider text-emerald-900">
                  <th className="px-4 py-2.5">Acción</th>
                  <th className="px-4 py-2.5">Responsable</th>
                  <th className="px-4 py-2.5">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50">
                {content.actionItems.map((item, index) => (
                  <tr key={`${item.action}-${index}`} className="hover:bg-emerald-50/40">
                    <td className="px-4 py-2.5 align-top text-slate-800">{item.action}</td>
                    <td className="px-4 py-2.5 align-top font-medium text-emerald-900">
                      {item.owner}
                    </td>
                    <td className="px-4 py-2.5 align-top whitespace-nowrap text-slate-700">
                      {item.dueDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
