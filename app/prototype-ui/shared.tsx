"use client";
// PROTOTYPE — throwaway. Shared bits so the four variants look like the real app
// (dark mode, German, pulse dot, overflow triangle — all kept on purpose).

import { useEffect, useState } from "react";
import clsx from "clsx";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Tooltip } from "@/components/tooltip";
import { formatTime } from "@/lib/util";
import { PNode, lesson } from "./fakeTree";

/**
 * Copy of lib/hooks.ts useElapsedTimer. Copied on purpose: that module also
 * imports the server actions, which pull in prisma — the prototype must stay
 * free of the server so it runs with no DB and no login.
 */
export function useElapsed(startedAt: Date | null): number {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startedAt) {
      setElapsed(0);
      return;
    }
    const start = new Date(startedAt).getTime();
    setElapsed(Math.floor((Date.now() - start) / 1000));
    const i = setInterval(
      () => setElapsed(Math.floor((Date.now() - start) / 1000)),
      1000,
    );
    return () => clearInterval(i);
  }, [startedAt]);
  return elapsed;
}

export function PulseDot() {
  return (
    <span className="inline-block w-2 h-2 shrink-0 rounded-full bg-zinc-700 dark:bg-zinc-300 mr-2 animate-pulse-dot" />
  );
}

export function OverflowWarning() {
  return (
    <Tooltip
      maxWidth="md"
      content="Die geschätzte Zeit für diese Aufgabe ist geringer als die Summe aller Schätzungen der Unteraufgaben."
    >
      <ExclamationTriangleIcon className="text-red-500 dark:text-red-400 h-5 w-5 shrink-0" />
    </Tooltip>
  );
}

export function hhmm(seconds: number) {
  return formatTime(seconds, "sec", "HH:MM", true);
}

export function TimerChip({ seconds }: { seconds: number }) {
  return (
    <span className="inline-flex items-center rounded-md border border-gray-300 px-1.5 py-0.5 text-sm font-mono tabular-nums text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
      {seconds < 3600
        ? formatTime(seconds, "sec", "MM:SS", true)
        : formatTime(seconds, "sec", "HH:MM", true)}
    </span>
  );
}

/** Dumb row time: total vs planned. No split — the split lives in the place. */
export function RowTime({ node, extra = 0 }: { node: PNode; extra?: number }) {
  const l = lesson(node);
  const total = l.total + extra;
  if (total === 0 && node.estimate == null) return null;
  const over = l.planned > 0 && total > l.planned;
  return (
    <span
      className={clsx(
        "text-sm tabular-nums",
        over ? "text-red-500 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400",
      )}
    >
      {total > 0 ? hhmm(total) : "—"}
      {node.estimate != null && ` / ${formatTime(node.estimate, "min", "HH:MM", true)}`}
    </span>
  );
}

/**
 * The lesson panel — only ever shown inside a task's place, never on a row.
 * This is the whole reason the "place" idea exists: one number can't tell
 * scope error from effort error.
 */
export function LessonPanel({ node }: { node: PNode }) {
  const l = lesson(node);
  const max = Math.max(l.total, l.planned, 1);
  const pct = (v: number) => `${(v / max) * 100}%`;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
      <div className="text-sm font-semibold mb-3 dark:text-white">
        Wo ist die Zeit hin?
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
            geplant
          </span>
          <div className="flex-1 h-3 rounded bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-zinc-400 dark:bg-zinc-500"
              style={{ width: pct(l.planned) }}
            />
          </div>
          <span className="w-16 text-right text-xs tabular-nums dark:text-zinc-300">
            {hhmm(l.planned)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
            gebraucht
          </span>
          <div className="flex-1 h-3 rounded bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
            <Tooltip content="Zeit direkt an dieser Aufgabe">
              <div
                className="h-full bg-blue-500 dark:bg-blue-400"
                style={{ width: pct(l.own) }}
              />
            </Tooltip>
            <Tooltip content="Zeit in den Unteraufgaben">
              <div
                className="h-full bg-amber-500 dark:bg-amber-400"
                style={{ width: pct(l.subs) }}
              />
            </Tooltip>
          </div>
          <span className="w-16 text-right text-xs tabular-nums dark:text-zinc-300">
            {hhmm(l.total)}
          </span>
        </div>
      </div>

      <div className="mt-3 flex gap-4 text-xs">
        <span className="flex items-center gap-1.5 dark:text-zinc-300">
          <span className="w-2 h-2 rounded-sm bg-blue-500 dark:bg-blue-400" />
          selbst {hhmm(l.own)}
        </span>
        <span className="flex items-center gap-1.5 dark:text-zinc-300">
          <span className="w-2 h-2 rounded-sm bg-amber-500 dark:bg-amber-400" />
          Unteraufgaben {hhmm(l.subs)}
        </span>
      </div>

      {l.planned > 0 && l.overrun > 0 && (
        <div className="mt-4 border-t border-zinc-200 dark:border-zinc-700 pt-3 text-sm">
          <span className="dark:text-white">
            {hhmm(l.overrun)} über der Schätzung.{" "}
          </span>
          {l.dominant === "scope" ? (
            <span className="text-zinc-600 dark:text-zinc-400">
              Der grösste Teil steckt in Unteraufgaben, die es bei der Schätzung
              noch nicht gab — <strong className="text-amber-600 dark:text-amber-400">Scope-Fehler</strong>.
              Die Schätzung war nicht falsch, die Arbeit war grösser als gedacht.
            </span>
          ) : (
            <span className="text-zinc-600 dark:text-zinc-400">
              Die Zeit ging in die Aufgabe selbst —{" "}
              <strong className="text-blue-600 dark:text-blue-400">Effort-Fehler</strong>.
              Der Umfang stimmte, die Dauer war unterschätzt.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
