import Image from "next/image";
import type { ReactNode } from "react";

import {
  uiAuthMain,
  uiAuthMainWide,
  uiCard,
  uiCardSub,
  uiCardTitle,
  uiPage,
} from "@/lib/ui-classes";

type AuthShellProps = {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  wide?: boolean;
};

export function AuthShell({ title, description, children, wide }: AuthShellProps) {
  return (
    <div className={uiPage}>
      <main className={wide ? uiAuthMainWide : uiAuthMain}>
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
            <Image
              src="/branding/vpc-logo.png"
              alt="Value Project Consulting"
              width={48}
              height={48}
              className="h-10 w-10 object-contain"
              priority
            />
          </div>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Value Project Consulting
          </p>
        </div>

        <div className={uiCard}>
          <h1 className={uiCardTitle}>{title}</h1>
          {description ? <p className={uiCardSub}>{description}</p> : null}
          {children}
        </div>
      </main>
    </div>
  );
}
