"use client";
// PROTOTYPE — throwaway. Holds the variant + focus in the URL so a view can be
// linked and compared: ?v=1..4&focus=<id>

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { buildFakeTree } from "./fakeTree";
import { DoneMode, SwitcherBar } from "./switcher-bar";
import VariantTree from "./variant-tree";
import VariantPlace from "./variant-place";
import VariantColumns from "./variant-columns";
import VariantTimer from "./variant-timer";

export default function PrototypeUI() {
  const router = useRouter();
  const params = useSearchParams();

  const variant = params.get("v") ?? "1";
  const focusId = params.get("focus");

  const [doneMode, setDoneMode] = useState<DoneMode>("global");
  const [showDone, setShowDone] = useState(false);

  // built once — the tree must not reshuffle when you flip variants
  const roots = useMemo(() => buildFakeTree(), []);

  function setParams(next: Record<string, string | null>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    router.replace(`?${p.toString()}`, { scroll: false });
  }

  const open = (id: string | null) => setParams({ focus: id });

  return (
    <div>
      <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-200">
        <strong>Prototyp</strong> — Wegwerf-Code, erfundene Daten, nichts wird
        gespeichert. Tiefster Ast: 10 Ebenen, der Timer läuft auf Ebene 7.
      </div>

      {variant === "1" && (
        <VariantTree
          roots={roots}
          doneMode={doneMode}
          showDone={showDone}
          onOpen={(id) => setParams({ v: "2", focus: id })}
        />
      )}
      {variant === "2" && (
        <VariantPlace
          roots={roots}
          focusId={focusId}
          doneMode={doneMode}
          showDone={showDone}
          onOpen={open}
        />
      )}
      {variant === "3" && (
        <VariantColumns
          roots={roots}
          focusId={focusId}
          doneMode={doneMode}
          showDone={showDone}
          onOpen={open}
        />
      )}
      {variant === "4" && (
        <VariantTimer
          roots={roots}
          doneMode={doneMode}
          showDone={showDone}
          onOpen={(id) => setParams({ v: "2", focus: id })}
        />
      )}

      <SwitcherBar
        variant={variant}
        onVariant={(v) => setParams({ v })}
        doneMode={doneMode}
        onDoneMode={setDoneMode}
        showDone={showDone}
        onShowDone={setShowDone}
      />
    </div>
  );
}
