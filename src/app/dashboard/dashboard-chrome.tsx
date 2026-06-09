"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";

import { signOutAction } from "./sign-out";
import { SidebarNav } from "./sidebar-nav";
import { STORAGE_SIDEBAR_HIDDEN } from "./nav-config";

type DashboardChromeProps = {
  personDisplayName: string;
  personInitials: string;
  personAvatarUrl: string | null;
  roleLabel: string;
  tenantName: string;
  dateLabel: string;
  showPlatformAdmin: boolean;
  mainBanner?: React.ReactNode;
  children: React.ReactNode;
};

export function DashboardChrome({
  personDisplayName,
  personInitials,
  personAvatarUrl,
  roleLabel,
  tenantName,
  dateLabel,
  showPlatformAdmin,
  mainBanner,
  children,
}: DashboardChromeProps) {
  const pathname = usePathname();
  const sheetTitleId = useId();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarHidden, setDesktopSidebarHidden] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        setDesktopSidebarHidden(
          window.localStorage.getItem(STORAGE_SIDEBAR_HIDDEN) === "1",
        );
      } catch {
        /* ignore */
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const persistSidebarHidden = useCallback((hidden: boolean) => {
    setDesktopSidebarHidden(hidden);
    try {
      window.localStorage.setItem(STORAGE_SIDEBAR_HIDDEN, hidden ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      closeMobileMenu();
    }, 0);
    return () => clearTimeout(id);
  }, [pathname, closeMobileMenu]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobileMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen, closeMobileMenu]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  const panelBody = (opts: { onNav?: () => void; showCollapseHint?: boolean }) => (
    <>
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
          {personAvatarUrl ? (
            <Image
              src={personAvatarUrl}
              alt=""
              width={40}
              height={40}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-md bg-slate-800 text-xs font-semibold text-slate-100">
              {personInitials}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 text-sm">
          <p className="truncate font-semibold text-slate-900">{personDisplayName}</p>
          <p className="truncate text-slate-600">{roleLabel}</p>
          <p className="truncate text-xs text-slate-500">{tenantName}</p>
        </div>
      </div>
      <p className="mt-2 text-xs capitalize text-slate-500">{dateLabel}</p>

      <SidebarNav showPlatformAdmin={showPlatformAdmin} onLinkClick={opts.onNav} />

      {opts.showCollapseHint && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => persistSidebarHidden(true)}
            className="flex w-full items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Ocultar menú
          </button>
        </div>
      )}

      <form action={signOutAction} className="mt-3">
        <button
          type="submit"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Cerrar sesión
        </button>
      </form>
    </>
  );

  return (
    <div className="flex flex-1 gap-4 md:gap-5">
      {desktopSidebarHidden ? (
        <aside
          className="dash-nav-panel hidden w-12 shrink-0 p-2 md:block"
          aria-label="Mostrar menú"
        >
          <button
            type="button"
            onClick={() => persistSidebarHidden(false)}
            className="flex h-full min-h-[8rem] w-full flex-col items-center justify-start gap-2 rounded-lg py-3 text-sm text-slate-700 hover:bg-slate-50"
            aria-label="Mostrar menú de navegación"
          >
            <span aria-hidden className="text-base">
              ☰
            </span>
            <span className="text-xs font-medium [writing-mode:vertical-rl]">Menú</span>
          </button>
        </aside>
      ) : (
        <aside
          className="dash-nav-panel hidden w-56 shrink-0 p-4 md:sticky md:top-5 md:block md:max-h-[calc(100vh-2.5rem)] md:self-start md:overflow-y-auto"
          aria-label="Navegación principal"
        >
          {panelBody({ showCollapseHint: true })}
        </aside>
      )}

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="presentation">
          <button
            type="button"
            className="dash-drawer-backdrop absolute inset-0 border-0 bg-black/55 p-0"
            aria-label="Cerrar menú"
            onClick={closeMobileMenu}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={sheetTitleId}
            className="dash-bottom-sheet dash-nav-panel absolute bottom-0 left-0 right-0 max-h-[min(85dvh,640px)] overflow-y-auto rounded-t-2xl border-b-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl"
          >
            <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-slate-300" aria-hidden />
            <p id={sheetTitleId} className="sr-only">
              Menú y accesos
            </p>
            {panelBody({ onNav: closeMobileMenu })}
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="mb-4 flex items-center border-b border-slate-200 pb-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            aria-label="Abrir menú de navegación"
          >
            <span aria-hidden>☰</span>
            Menú
          </button>
        </div>

        {mainBanner}
        {children}
      </div>
    </div>
  );
}
