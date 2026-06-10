"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";

import { PMO_HUB } from "@/lib/dashboard-paths";
import { signOutAction } from "@/app/dashboard/sign-out";
import { STORAGE_SIDEBAR_HIDDEN } from "@/app/dashboard/nav-config";

import { AdminNav } from "./admin-nav";

type AdminChromeProps = {
  personDisplayName: string;
  personInitials: string;
  personAvatarUrl: string | null;
  dateLabel: string;
  children: React.ReactNode;
};

export function AdminChrome({
  personDisplayName,
  personInitials,
  personAvatarUrl,
  dateLabel,
  children,
}: AdminChromeProps) {
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
      <div className="dash-nav-divider flex items-center gap-3 border-b pb-3">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/15 bg-white/10">
          {personAvatarUrl ? (
            <Image
              src={personAvatarUrl}
              alt=""
              width={48}
              height={48}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-md bg-slate-700 text-sm font-semibold text-slate-100">
              {personInitials}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 text-sm">
          <p className="dash-nav-name truncate font-semibold">{personDisplayName}</p>
          <p className="dash-nav-role truncate">Administración global</p>
          <p className="dash-nav-tenant truncate text-xs">Value Project Consulting</p>
        </div>
      </div>
      <p className="dash-nav-meta mt-2 text-xs capitalize">{dateLabel}</p>

      <AdminNav onLinkClick={opts.onNav} />

      <div className="mt-4 space-y-2">
        <Link
          href={PMO_HUB}
          onClick={opts.onNav}
          className="dash-nav-button flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition hover:bg-white/10"
        >
          <span className="text-base leading-none" aria-hidden>
            📊
          </span>
          Volver al tablero
        </Link>

        {opts.showCollapseHint && (
          <button
            type="button"
            onClick={() => persistSidebarHidden(true)}
            className="dash-nav-button flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition hover:bg-white/10"
          >
            <span className="text-base leading-none" aria-hidden>
              ←
            </span>
            Ocultar menú
          </button>
        )}

        <form action={signOutAction}>
          <button
            type="submit"
            className="dash-nav-button flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition hover:bg-white/10"
          >
            <span className="text-base leading-none" aria-hidden>
              🔒
            </span>
            Cerrar sesión
          </button>
        </form>
      </div>
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
            className="flex h-full min-h-[8rem] w-full flex-col items-center justify-start gap-2 rounded-lg py-3 text-sm text-slate-200 hover:bg-white/10"
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
          aria-label="Administración global"
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
              Menú de administración
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
        {children}
      </div>
    </div>
  );
}
