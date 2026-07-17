"use client";
// PROTOTYPE — throwaway. Floating bar to flip between variants.

import clsx from "clsx";

export type DoneMode = "global" | "perLevel";

/**
 * Which children to render. Time is always rolled up over ALL children, done or
 * not — hiding a task must never change a number.
 *   global   → one switch decides for the whole tree
 *   perLevel → done are hidden here, each level offers its own toggle
 */
export function visibleChildren<T extends { status: string }>(
  children: T[],
  doneMode: DoneMode,
  showDone: boolean,
): T[] {
  if (doneMode === "global" && showDone) return children;
  return children.filter((c) => c.status !== "DONE");
}

export const VARIANTS = [
  { v: "1", name: "Baum (heute)", hint: "aktueller Stand als Vergleich" },
  { v: "2", name: "Fokus", hint: "Summary oben + Baum, Einrückung gedeckelt, tauchen" },
  { v: "3", name: "Flach", hint: "Summary oben + Teilbaum ganz ohne Einrückung" },
] as const;

export function SwitcherBar({
  variant,
  onVariant,
  doneMode,
  onDoneMode,
  showDone,
  onShowDone,
}: {
  variant: string;
  onVariant: (v: string) => void;
  doneMode: DoneMode;
  onDoneMode: (m: DoneMode) => void;
  showDone: boolean;
  onShowDone: (b: boolean) => void;
}) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[95vw]">
      <div className="flex flex-col gap-2 rounded-xl border border-zinc-300 bg-white/95 p-2 shadow-lg backdrop-blur dark:border-zinc-600 dark:bg-zinc-800/95">
        <div className="flex gap-1">
          {VARIANTS.map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => onVariant(o.v)}
              title={o.hint}
              className={clsx(
                "rounded-lg px-3 py-2 text-sm whitespace-nowrap",
                variant === o.v
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700",
              )}
            >
              <span className="font-mono text-xs opacity-60 mr-1.5">{o.v}</span>
              {o.name}
            </button>
          ))}
        </div>

        {/* #5: feel the difference between one switch and one per level */}
        <div className="flex items-center gap-2 border-t border-zinc-200 pt-2 dark:border-zinc-700">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Erledigte:
          </span>
          <button
            type="button"
            onClick={() => onDoneMode("global")}
            className={clsx(
              "rounded px-2 py-1 text-xs",
              doneMode === "global"
                ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-600 dark:text-white"
                : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700",
            )}
          >
            ein Schalter
          </button>
          <button
            type="button"
            onClick={() => onDoneMode("perLevel")}
            className={clsx(
              "rounded px-2 py-1 text-xs",
              doneMode === "perLevel"
                ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-600 dark:text-white"
                : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700",
            )}
          >
            pro Ebene
          </button>

          {doneMode === "global" && (
            <label className="ml-2 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <input
                type="checkbox"
                checked={showDone}
                onChange={(e) => onShowDone(e.target.checked)}
                className="rounded"
              />
              anzeigen
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
