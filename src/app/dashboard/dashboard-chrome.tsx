"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { signOutAction } from "./sign-out";
import { SidebarNav } from "./sidebar-nav";
import { STORAGE_SIDEBAR_HIDDEN } from "./nav-config";

type DashboardChromeProps = {
  personDisplayName: string;
  roleLabel: string;
  tenantName: string;
  tenantSlug: string;
  dateLabel: string;
  tenantLogoUrl: string | null;
  tenantInitials: string;
  showPlatformAdmin: boolean;
  mainBanner?: React.ReactNode;
  children: React.ReactNode;
};

export function DashboardChrome({
  personDisplayName,
  roleLabel,
  tenantName,
  tenantSlug,
  dateLabel,
  tenantLogoUrl,
  tenantInitials,
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
      <div className="flex gap-3 border-b border-[#e8dfd0] pb-4">
        <div className="relative shrink-0 overflow-hidden rounded-xl border border-[#c9a46c]/45 bg-[linear-gradient(165deg,#ffffff_0%,#faf8f4_100%)] shadow-sm ring-1 ring-[#0f1f5c]/[0.05]">
          {tenantLogoUrl ? (
            <Image
              src={tenantLogoUrl}
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 object-contain"
              unoptimized
            />
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center text-sm font-bold tracking-tight text-[#c9a46c]"
              style={{ background: "linear-gradient(145deg,#0f1f5c 0%,#152d4f 100%)" }}
            >
              {tenantInitials}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="dash-identity-name text-lg font-semibold leading-tight text-[#0f1f5c]">
            {personDisplayName}
          </p>
          <p className="mt-1 text-[13px] font-medium text-[#5c5346]">{roleLabel}</p>
          <p className="mt-0.5 truncate text-[12px] text-[#6b5c48]">
            {tenantName} · {tenantSlug}
          </p>
          <p className="mt-1 text-[11px] font-medium capitalize leading-snug text-[#8a8278]">
            {dateLabel}
          </p>
        </div>
      </div>

      <SidebarNav showPlatformAdmin={showPlatformAdmin} onLinkClick={opts.onNav} />

      {opts.showCollapseHint && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => persistSidebarHidden(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#e3d6c4] bg-[#faf8f4] px-3 py-2.5 text-sm font-medium text-[#0f1f5c] transition hover:border-[#c9a46c]/60 hover:bg-[#f5efe3]"
          >
            <span aria-hidden>⤢</span>
            Ocultar menú
          </button>
        </div>
      )}

      <form action={signOutAction} className="mt-4">
        <button
          type="submit"
          className="w-full rounded-xl border border-[#e3d6c4] bg-white px-3 py-2.5 text-sm font-medium text-[#0f1f5c] transition hover:border-[#c9a46c]/55 hover:bg-[#faf8f4]"
        >
          Cerrar sesión
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
            <div className="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-[#d4c4b0]" aria-hidden />
            <p id={sheetTitleId} className="sr-only">
              Menú y accesos
            </p>
            {panelBody({ onNav: closeMobileMenu })}
          </div>
        </div>
      )}

      <button
        type="button"
        className={[
          "dash-menu-fab inline-flex items-center gap-2 rounded-full border border-[#c9a46c]/35 px-4 py-2 text-sm font-semibold text-[#0f1f5c] shadow-md backdrop-blur-sm",
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
