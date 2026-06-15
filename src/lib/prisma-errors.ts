import { Prisma } from "@prisma/client";

export function isMissingTableError(err: unknown, tableHint?: string): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (err.code !== "P2021") return false;
  if (!tableHint) return true;
  const message = `${err.message} ${JSON.stringify(err.meta ?? {})}`;
  return message.includes(tableHint);
}

export function escalationTableMissingMessage(): string {
  return "Falta la tabla EscalationCheck en la base de datos. Aplica la migración 20260609190000_escalation_checks (GitHub Actions Database migrate o SQL en Supabase).";
}

export function meetingRoiTableMissingMessage(): string {
  return "Falta la tabla MeetingRoiSession en la base de datos. Aplica la migración 20260609200000_meeting_roi_sessions (GitHub Actions Database migrate o SQL en Supabase).";
}

export function meetingMinuteTableMissingMessage(): string {
  return "Falta la tabla MeetingMinute en la base de datos. Aplica la migración 20260608120000_meeting_minutes (GitHub Actions Database migrate o SQL en Supabase).";
}
