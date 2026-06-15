"use client";

import type { MeetingMinuteContent } from "@/lib/meeting-minute-types";
import { dashCard } from "@/lib/ui-classes";

type MinuteContentViewProps = {
  content: MeetingMinuteContent;
  className?: string;
};

export function MinuteContentView({ content, className = "" }: MinuteContentViewProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      <section className={dashCard}>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Resumen
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
          {content.summary}
        </p>
      </section>

      {content.topics.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Puntos tratados
          </h2>
          {content.topics.map((topic, index) => (
            <article key={`${topic.title}-${index}`} className={dashCard}>
              <h3 className="font-medium text-slate-900">{topic.title}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {topic.description}
              </p>
            </article>
          ))}
        </section>
      ) : null}

      <section className={dashCard}>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Acuerdos y tareas de seguimiento
        </h2>
        {content.actionItems.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No se identificaron acuerdos en la sesión.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2">Acción</th>
                  <th className="px-3 py-2">Responsable</th>
                  <th className="px-3 py-2">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {content.actionItems.map((item, index) => (
                  <tr key={`${item.action}-${index}`}>
                    <td className="px-3 py-2 align-top text-slate-800">{item.action}</td>
                    <td className="px-3 py-2 align-top text-slate-700">{item.owner}</td>
                    <td className="px-3 py-2 align-top whitespace-nowrap text-slate-700">
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
