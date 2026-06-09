"use client";

import { useState } from "react";

import type { RiskClientRow } from "./risk-manager-view";
import { RISK_FIELD_HINTS } from "./risk-field-hints";
import { RiskFieldLabel } from "./risk-field-label";
import { residualScore } from "./risk-utils";
import { uiButtonPrimary, uiInput } from "@/lib/ui-classes";

type RiskDetailEditFormProps = {
  risk: RiskClientRow;
  updateAction: (formData: FormData) => void | Promise<void>;
};

export function RiskDetailEditForm({ risk, updateAction }: RiskDetailEditFormProps) {
  const [resProb, setResProb] = useState(risk.residualProb);

  return (
    <form
      action={updateAction}
      className="mt-4 space-y-3 border-t border-slate-200 pt-4"
      onSubmit={(e) => {
        const fd = new FormData(e.currentTarget);
        const rp = Number(fd.get("residualProb") ?? risk.residualProb);
        const cont = String(fd.get("contingency") ?? "").trim();
        const rs = residualScore(rp, risk.impactAmount);
        if (rs > 10 && !cont) {
          e.preventDefault();
          window.alert(
            "Plan de contingencia obligatorio cuando el score residual es mayor que 10.",
          );
        }
      }}
    >
      <input type="hidden" name="riskId" value={risk.id} />
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Actualizar plan de respuesta
      </p>

      <label>
        <RiskFieldLabel hint={RISK_FIELD_HINTS.owner}>Dueño</RiskFieldLabel>
        <input name="ownerName" defaultValue={risk.ownerName} required className={uiInput} />
      </label>

      <label>
        <RiskFieldLabel hint={RISK_FIELD_HINTS.residualProb}>
          Probabilidad residual ({resProb}%)
        </RiskFieldLabel>
        <input
          type="range"
          name="residualProb"
          min={1}
          max={100}
          value={resProb}
          onChange={(e) => setResProb(Number(e.target.value))}
          className="w-full accent-slate-800"
        />
      </label>

      <label>
        <RiskFieldLabel hint={RISK_FIELD_HINTS.dueDate}>Caducidad</RiskFieldLabel>
        <input
          name="dueDate"
          type="date"
          defaultValue={risk.dueDate ? risk.dueDate.slice(0, 10) : ""}
          className={uiInput}
        />
      </label>

      <label>
        <RiskFieldLabel hint={RISK_FIELD_HINTS.mitigation}>Mitigación</RiskFieldLabel>
        <textarea
          name="mitigation"
          rows={3}
          defaultValue={risk.mitigation ?? ""}
          className={uiInput}
        />
      </label>

      <label>
        <RiskFieldLabel hint={RISK_FIELD_HINTS.trigger}>Disparador Plan B</RiskFieldLabel>
        <textarea name="trigger" rows={2} defaultValue={risk.trigger ?? ""} className={uiInput} />
      </label>

      <label>
        <RiskFieldLabel hint={RISK_FIELD_HINTS.contingency}>Contingencia</RiskFieldLabel>
        <textarea
          name="contingency"
          rows={3}
          defaultValue={risk.contingency ?? ""}
          className={uiInput}
        />
      </label>

      <button type="submit" className={uiButtonPrimary.replace("w-full ", "w-auto ")}>
        Guardar cambios
      </button>
    </form>
  );
}
