"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { signOutAction } from "./sign-out";
import { SidebarNav } from "./sidebar-nav";
import { STORAGE_SIDEBAR_HIDDEN } from "./nav-config";

type DashboardChromeProps = {
  greetingWord: string;
  firstName: string;
  tenantLine: string;
  email: string;
  showPlatformAdmin: boolean;
  mainBanner?: React.ReactNode;
  children: React.ReactNode;
};

export function DashboardChrome({
  greetingWord,
  firstName,
  tenantLine,
  email,
  showPlatformAdmin,
  mainBanner,
  children,
}: DashboardChromeProps) {
  const pathname = usePathname();
  const sheetTitleId = useId();
  const pathOnMountRef = useRef<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarHidden, setDesktopSidebarHidden] = useState(false);

  useEffect(() => {
    try {
      setDesktopSidebarHidden(window.localStorage.getItem(STORAGE_SIDEBAR_HIDDEN) === "1");
    } catch {
      /* ignore */
    }
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

  /** Tras el primer render: cada cambio de ruta oculta el lateral (pantalla completa al entrar a una sección). */
  useEffect(() => {
    if (pathOnMountRef.current === null) {
      pathOnMountRef.current = pathname;
      return;
    }
    if (pathOnMountRef.current !== pathname) {
      pathOnMountRef.current = pathname;
      persistSidebarHidden(true);
    }
  }, [pathname, persistSidebarHidden]);

  useEffect(() => {
    closeMobileMenu();
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
      <p className="dash-greeting text-lg font-medium leading-snug text-zinc-800">
        {greetingWord},
      </p>
      <p className="mt-1 text-xl font-semibold leading-tight">
        <span className="bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent">
          {firstName}
        </span>{" "}
        <span aria-hidden className="dash-hand-wave inline-block">
          👋
        </span>
      </p>
      <p className="mt-2 text-xs leading-relaxed text-zinc-500">{tenantLine}</p>
      <p className="mt-3 truncate text-[11px] text-zinc-400">{email}</p>

      <SidebarNav showPlatformAdmin={showPlatformAdmin} onLinkClick={opts.onNav} />

      {opts.showCollapseHint && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => persistSidebarHidden(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
          >
            <span aria-hidden>⤢</span>
            Ocultar menú
          </button>
        </div>
      )}

      <form action={signOutAction} className="mt-4">
        <button
          type="submit"
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
        >
          🚪 Cerrar sesión
        </button>
      </form>
    </>
  );

  return (
    <div className="relative z-[1] flex flex-1 flex-col gap-6 md:flex-row">
      <aside
        className={[
          "dash-nav-panel hidden w-full shrink-0 p-5 md:block md:w-72 md:max-w-[18rem]",
          desktopSidebarHidden ? "md:hidden" : "",
        ].join(" ")}
        aria-label="Navegación principal"
      >
        {panelBody({ showCollapseHint: true })}
      </aside>

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
            className="dash-bottom-sheet dash-nav-panel absolute bottom-0 left-0 right-0 max-h-[min(85dvh,640px)] overflow-y-auto rounded-t-2xl border-b-0 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl"
          >
            <div className="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-zinc-300" aria-hidden />
            <p id={sheetTitleId} className="sr-only">
              Menú y accesos
            </p>
            {panelBody({ onNav: closeMobileMenu })}
          </div>
        </div>
      )}

      {/** Un solo FAB: visibilidad solo con clases (evita doble botón si outer OR falla). */}
      <button
        type="button"
        className={[
          "dash-menu-fab inline-flex items-center gap-2 rounded-full border border-black/[0.08] px-4 py-2 text-sm font-medium shadow-md backdrop-blur-sm",
          "left-4 top-[max(1rem,env(safe-area-inset-top))] md:top-[6.5rem]",
          mobileMenuOpen ? "max-md:hidden" : "max-md:inline-flex",
          desktopSidebarHidden ? "md:inline-flex" : "md:hidden",
        ].join(" ")}
        onClick={() => {
          if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
            persistSidebarHidden(false);
          } else {
            setMobileMenuOpen(true);
          }
        }}
        aria-label="Abrir menú de navegación"
      >
        <span aria-hidden>☰</span>
        <span>Menú</span>
      </button>

      <section className="dash-content-shell min-h-[min(100vh,920px)] flex-1 overflow-hidden px-4 pt-4 max-md:pt-16 sm:px-6 md:pt-6">
        {mainBanner}
        {children}
      </section>
    </div>
  );
}
