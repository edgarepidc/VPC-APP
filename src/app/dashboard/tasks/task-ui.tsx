"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_THEME,
  TASK_STATUS_BADGE,
  TASK_STATUS_LABEL,
  normalizeTaskPriority,
  normalizeTaskStatus,
  type TaskKanbanStatus,
  type TaskPriority,
} from "@/modules/tasks/constants";
import { checklistProgress, type TaskChecklistItem } from "@/modules/tasks/json";

import { toggleTaskChecklistItemAction } from "./actions";

export function TaskStatusBadge({ status }: { status: string }) {
  const st = normalizeTaskStatus(status);
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${TASK_STATUS_BADGE[st]}`}
    >
      {TASK_STATUS_LABEL[st]}
    </span>
  );
}

export function TaskPriorityBadge({ priority }: { priority: string }) {
  const p = normalizeTaskPriority(priority);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${TASK_PRIORITY_THEME[p].badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${TASK_PRIORITY_THEME[p].dot}`} aria-hidden />
      {TASK_PRIORITY_LABEL[p]}
    </span>
  );
}

export function TaskPriorityDot({ priority }: { priority: string }) {
  const p = normalizeTaskPriority(priority);
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${TASK_PRIORITY_THEME[p].dot}`}
      title={`Prioridad ${TASK_PRIORITY_LABEL[p].toLowerCase()}`}
      aria-hidden
    />
  );
}

export function TaskChecklistProgress({ items }: { items: TaskChecklistItem[] }) {
  const progress = checklistProgress(items);
  if (!progress) return null;
  const pct = Math.round((progress.done / progress.total) * 100);
  return (
    <div className="min-w-0">
      <div className="mb-0.5 flex items-center justify-between gap-2 text-[10px] text-slate-500">
        <span>Checklist</span>
        <span className="tabular-nums">
          {progress.done}/{progress.total}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function TaskChecklistInline({
  taskId,
  items,
  canWrite,
  maxItems = 3,
}: {
  taskId: string;
  items: TaskChecklistItem[];
  canWrite: boolean;
  maxItems?: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (items.length === 0) return null;

  const visible = items.slice(0, maxItems);
  const hidden = items.length - visible.length;

  function toggle(itemId: string) {
    if (!canWrite || pending) return;
    const fd = new FormData();
    fd.set("taskId", taskId);
    fd.set("itemId", itemId);
    startTransition(async () => {
      try {
        await toggleTaskChecklistItemAction(fd);
        router.refresh();
      } catch {
        alert("No se pudo actualizar el checklist.");
      }
    });
  }

  return (
    <div className={`space-y-1 ${pending ? "opacity-60" : ""}`} onClick={(e) => e.stopPropagation()}>
      {visible.map((item) => (
        <label
          key={item.id}
          className="flex cursor-pointer items-start gap-1.5 text-[10px] leading-snug text-slate-600"
        >
          <input
            type="checkbox"
            checked={item.done}
            disabled={!canWrite || pending}
            onChange={() => toggle(item.id)}
            className="mt-0.5 shrink-0 rounded border-slate-300"
          />
          <span className={item.done ? "line-through text-slate-400" : ""}>{item.text}</span>
        </label>
      ))}
      {hidden > 0 ? <p className="text-[10px] text-slate-400">+{hidden} más…</p> : null}
    </div>
  );
}

export function taskCalendarChipClass(status: string): string {
  const st = normalizeTaskStatus(status);
  const map: Record<TaskKanbanStatus, string> = {
    todo: "bg-slate-100 text-slate-800 ring-slate-200",
    in_progress: "bg-sky-50 text-sky-900 ring-sky-200",
    done: "bg-emerald-50 text-emerald-900 ring-emerald-200 line-through decoration-emerald-700/50",
  };
  return `truncate rounded-md px-1.5 py-1 text-[10px] ring-1 ring-inset ${map[st]}`;
}

export function taskGanttBarClass(priority: string, status: string): string {
  const st = normalizeTaskStatus(status);
  if (st === "done") return "bg-emerald-500/90";
  return `${TASK_PRIORITY_THEME[normalizeTaskPriority(priority) as TaskPriority].gantt}/90`;
}
