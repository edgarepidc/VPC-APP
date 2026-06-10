/** Clases Tailwind compartidas — paleta slate unificada, sin degradados. */

export const uiPage = "app-shell min-h-full";

export const uiAuthMain =
  "mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-12 sm:py-16";

export const uiAuthMainWide =
  "mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-12 sm:py-16";

export const uiCard =
  "rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8";

export const uiCardTitle = "text-2xl font-semibold tracking-tight text-slate-900";

export const uiCardSub = "mt-2 text-sm text-slate-600";

export const uiLabel = "block text-xs font-medium text-slate-600";

export const uiInput =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200";

export const uiButtonPrimary =
  "w-full rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60";

export const uiButtonSecondary =
  "rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50";

export const uiButtonGhost =
  "w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-800 transition hover:border-slate-300 hover:bg-slate-50";

export const uiLink = "text-sm font-medium text-slate-700 underline hover:text-slate-900";

export const uiAlertError =
  "rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-sm text-rose-700";

export const uiAlertSuccess =
  "rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-sm text-emerald-800";

export const uiAlertWarning =
  "rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-sm text-amber-900";

export const uiAlertInfo =
  "rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-700";

export const uiSectionLabel =
  "mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500";

/** Administración global */
export const adminShell =
  "app-shell mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 py-5 sm:px-5";

export const adminPage = "space-y-4";

export const adminSectionTitle = "text-base font-semibold text-slate-900";

export const adminSectionSub = "text-sm text-slate-600";

export const adminCard =
  "rounded-lg border border-slate-200 bg-white shadow-sm";

export const adminStatsBar =
  "flex flex-wrap items-center gap-x-8 gap-y-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm";

export const adminStatValue = "text-lg font-semibold tabular-nums text-slate-900";

export const adminStatLabel = "text-xs text-slate-500";

export const adminTable =
  "w-full min-w-[720px] border-collapse text-sm";

export const adminTh =
  "px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500";

export const adminTd = "px-3 py-2.5 align-middle text-slate-700";

export const adminAlertError =
  "rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800";

export const adminAlertOk =
  "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900";

export const adminAlertWarn =
  "rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950";

/** Botones compactos en tablas admin (misma altura y ancho mínimo). */
export const adminActionBtn =
  "inline-flex h-8 min-w-[5.25rem] items-center justify-center rounded-lg px-2.5 text-xs font-medium transition";

export const adminActionBtnPrimary =
  `${adminActionBtn} bg-slate-800 text-white hover:bg-slate-700`;

export const adminActionBtnSecondary =
  `${adminActionBtn} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;

export const adminActionBtnDanger =
  `${adminActionBtn} border border-rose-200 bg-white text-rose-800 hover:bg-rose-50`;

/** Dashboard workspace — escala tipográfica y espaciado unificados */
export const dashShell =
  "dash-shell mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 py-5 sm:px-5";

/** Separación vertical entre bloques de página */
export const dashPage = "space-y-4";

export const dashCard = adminCard;

export const dashCardBody = "p-4";

export const dashPageTitle = "text-lg font-semibold leading-tight text-slate-900";

export const dashSectionTitle = "text-base font-semibold text-slate-900";

export const dashSectionSub = "text-sm leading-relaxed text-slate-600";

export const dashTable = adminTable;

export const dashTh = adminTh;

export const dashTd = adminTd;

export const dashAlertError = adminAlertError;

export const dashAlertOk = adminAlertOk;

export const dashAlertWarn = adminAlertWarn;

export const dashKpiValue = "text-lg font-semibold tabular-nums text-slate-900";

export const dashKpiLabel = "text-xs text-slate-500";

export const dashTabActive =
  "rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white";

export const dashTabIdle =
  "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50";

export const dashDetailsSummary =
  "cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-900 marker:content-none [&::-webkit-details-marker]:hidden";

export const dashDetailsBody = "border-t border-slate-200 px-4 py-4";

export const dashKpiCard = `${dashCard} p-4`;

export const dashKpiGrid = "grid grid-cols-2 gap-3 lg:grid-cols-4";
