"use client";

import Link from "next/link";

import { MINUTE_PROVIDER_LABELS } from "@/lib/meeting-minute-types";
import type { MeetingMinuteRow } from "@/lib/meeting-minute-types";
import { formatEscalationDateTime, formatRelativeDate } from "@/lib/escalation-utils";
import { MINUTES_DETAIL } from "@/lib/dashboard-paths";

type MinuteHistoryListProps = {
  rows: MeetingMinuteRow[];
};

export function MinuteHistoryList({ rows }: MinuteHistoryListProps) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
        Aún no hay minutas guardadas. Genera la primera desde el formulario superior.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {rows.map((minute) => (
        <li
          key={minute.id}
          className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm transition hover:border-slate-300 hover:shadow-md"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Link
                href={MINUTES_DETAIL(minute.id)}
                className="font-medium text-slate-900 hover:text-slate-700 hover:underline"
              >
                {minute.title}
              </Link>
              <p className="text-slate-600">{minute.project.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {minute.authorName} ·{" "}
                <span
                  className={
                    minute.provider === "claude"
                      ? "font-medium text-amber-700"
                      : "font-medium text-sky-700"
                  }
                >
                  {MINUTE_PROVIDER_LABELS[minute.provider]}
                </span>{" "}
                · {formatEscalationDateTime(new Date(minute.createdAt))}
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p>{formatRelativeDate(new Date(minute.createdAt))}</p>
              {minute.meetingDate ? (
                <p className="mt-1">
                  Reunión: {formatEscalationDateTime(new Date(minute.meetingDate))}
                </p>
              ) : null}
            </div>
          </div>
          <p className="mt-2 line-clamp-2 text-xs text-slate-600">{minute.content.summary}</p>
        </li>
      ))}
    </ul>
  );
}
