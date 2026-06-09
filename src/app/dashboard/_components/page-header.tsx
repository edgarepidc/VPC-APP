import type { ReactNode } from "react";

import { dashPageTitle, dashSectionSub } from "@/lib/ui-classes";

type DashboardPageHeaderProps = {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
};

export function DashboardPageHeader({
  title,
  description,
  children,
}: DashboardPageHeaderProps) {
  return (
    <header className="border-b border-slate-200 pb-4">
      <h1 className={dashPageTitle}>{title}</h1>
      {description ? <p className={`mt-1 ${dashSectionSub}`}>{description}</p> : null}
      {children ? <div className="mt-3 space-y-2">{children}</div> : null}
    </header>
  );
}
