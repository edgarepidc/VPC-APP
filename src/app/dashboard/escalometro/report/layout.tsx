export default function EscalationReportLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <style>{`
        @media print {
          aside,
          .dash-nav-panel,
          header,
          nav[aria-label="Secciones PMO"],
          .mb-4.flex.items-center.border-b {
            display: none !important;
          }
          main {
            padding: 0 !important;
          }
        }
      `}</style>
      {children}
    </>
  );
}
