"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";

import { signOutAction } from "./sign-out";
import { SidebarNav } from "./sidebar-nav";
import { MOBILE_BOTTOM_PRIMARY, STORAGE_SIDEBAR_HIDDEN } from "./nav-config";

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
            Pantalla completa
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
      {/* Tablet y escritorio: panel lateral (teléfono: solo hoja “Más”) */}
      <aside
        className={[
          "dash-nav-panel hidden w-full shrink-0 p-5 md:block md:w-72 md:max-w-[18rem]",
          desktopSidebarHidden ? "md:hidden" : "",
        ].join(" ")}
        aria-label="Navegación principal"
      >
        {panelBody({ showCollapseHint: true })}
      </aside>

      {/* Teléfono: hoja “Más” */}
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

      {/* Escritorio colapsado: volver a mostrar lateral */}
      {desktopSidebarHidden && (
        <button
          type="button"
          className="dash-desktop-fab-trigger hidden md:flex"
          onClick={() => persistSidebarHidden(false)}
          aria-label="Mostrar menú lateral"
        >
          <span aria-hidden>☰</span>
          <span className="text-sm font-medium">Menú</span>
        </button>
      )}

      <section className="dash-content-shell min-h-[min(100vh,920px)] flex-1 overflow-hidden px-4 pt-4 max-md:pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 md:pb-6">
        {mainBanner}
        {children}
      </section>

      {/* Barra inferior solo en teléfono (&lt; md); tablet/escritorio usan el lateral */}
      <nav className="dash-bottom-bar md:hidden" aria-label="Accesos rápidos">
        {MOBILE_BOTTOM_PRIMARY.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "dash-bottom-bar__item flex flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium min-h-[44px] min-w-0 flex-1",
                active ? "dash-bottom-bar__item--active text-zinc-900" : "text-zinc-500",
              ].join(" ")}
              aria-current={active ? "page" : undefined}
            >
              <span className="text-xl leading-none" aria-hidden>
                {item.emoji}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="dash-bottom-bar__item flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium text-zinc-500"
        >
          <span className="text-xl leading-none" aria-hidden>
            ⋯
          </span>
          <span>Más</span>
        </button>
      </nav>
    </div>
  );
}
