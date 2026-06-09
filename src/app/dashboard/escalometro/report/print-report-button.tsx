"use client";

import { useEffect } from "react";

export function PrintReportButton() {
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (new URLSearchParams(window.location.search).get("auto") === "1") {
        window.print();
      }
    }, 400);
    return () => clearTimeout(id);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 print:hidden"
    >
      Imprimir / Guardar PDF
    </button>
  );
}
