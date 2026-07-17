"use client";
// PROTOTYPE — throwaway. Variant 2: the task is a PLACE.
// You stand inside one task. Its title is the heading, its children are the
// list, the lesson (own vs subs vs planned) is on the page — not in a dialog.
// Depth is free here: you never render more than one level, so nesting can go
// as deep as it likes.

import { useState } from "react";
import clsx from "clsx";
import {
  ChevronRightIcon,
  PlayIcon,
  PlusIcon,
  StopIcon,
} from "@heroicons/react/16/solid";
import { Heading } from "@/components/heading";
import { PNode, findPath, hasOverflow, hasActiveDescendant, countDescendants } from "./fakeTree";
import { PulseDot, OverflowWarning, RowTime, TimerChip, LessonPanel, useElapsed } from "./shared";
import { DoneMode, visibleChildren } from "./switcher-bar";

export default function VariantPlace({
  roots,
  focusId,
  doneMode,
  showDone,
  onOpen,
}: {
  roots: PNode[];
  focusId: string | null;
  doneMode: DoneMode;
  showDone: boolean;
  onOpen: (id: string | null) => void;
}) {
  const [showDoneHere, setShowDoneHere] = useState(false);
  const path = focusId ? findPath(roots, focusId) : null;
  const node = path?.[path.length - 1] ?? null;

  const kids = node ? node.children : roots;
  const doneKids = kids.filter((c) => c.status === "DONE");
  const shown =
    doneMode === "perLevel" && showDoneHere
      ? kids
      : visibleChildren(kids, doneMode, showDone);

  const running = node?.status === "IN_PROGRESS";
  const elapsed = useElapsed(running ? node!.startedAt : null);

  return (
    <div className="pb-32">
      {/* the path back — this is what makes depth survivable */}
      <nav className="flex items-center gap-1 flex-wrap text-sm mb-4">
        <button
          type="button"
          onClick={() => onOpen(null)}
          className="text-zinc-500 dark:text-zinc-400 hover:underline"
        >
          Projekt
        </button>
        {path?.map((p, i) => (
          <span key={p.id} className="flex items-center gap-1">
            <ChevronRightIcon className="w-3 h-3 text-zinc-300 dark:text-zinc-600" />
            <button
              type="button"
              onClick={() => onOpen(p.id)}
              className={clsx(
                "hover:underline truncate max-w-[16ch] sm:max-w-none",
                i === path.length - 1
                  ? "text-zinc-900 dark:text-white font-medium"
                  : "text-zinc-500 dark:text-zinc-400",
              )}
            >
              {p.title}
            </button>
          </span>
        ))}
      </nav>

      {node ? (
        <>
          <div className="flex items-start justify-between gap-4 mb-1">
            <Heading className="flex items-center">
              {running && <PulseDot />}
              {node.title}
            </Heading>
            <div className="flex items-center gap-2 shrink-0">
              {running && <TimerChip seconds={elapsed} />}
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                {running ? (
                  <StopIcon className="w-4 h-4" />
                ) : (
                  <PlayIcon className="w-4 h-4" />
                )}
                {running ? "Stopp" : "Start"}
              </button>
            </div>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            {node.children.length} Unteraufgaben · {countDescendants(node)} im
            ganzen Teilbaum
          </p>

          {/* the lesson lives HERE and only here */}
          <div className="mb-8">
            <LessonPanel node={node} />
          </div>
        </>
      ) : (
        <Heading className="mb-6">Zeiterfassung v2 (Prototyp-Daten)</Heading>
      )}

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold dark:text-white">
          {node ? "Unteraufgaben" : "Aufgaben"}
        </h2>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
        >
          <PlusIcon className="w-4 h-4" />
          Neu
        </button>
      </div>

      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 border-y border-zinc-100 dark:border-zinc-800">
        {shown.map((c) => (
          <ChildRow key={c.id} node={c} onOpen={onOpen} />
        ))}
        {shown.length === 0 && (
          <li className="py-6 text-sm text-zinc-400">Keine Unteraufgaben.</li>
        )}
      </ul>

      {doneMode === "perLevel" && doneKids.length > 0 && (
        <button
          type="button"
          onClick={() => setShowDoneHere((p) => !p)}
          className="mt-3 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          {showDoneHere
            ? "Abgeschlossene ausblenden"
            : `Abgeschlossen (${doneKids.length})`}
        </button>
      )}
    </div>
  );
}

function ChildRow({
  node,
  onOpen,
}: {
  node: PNode;
  onOpen: (id: string) => void;
}) {
  const running = node.status === "IN_PROGRESS";
  const activeBelow = hasActiveDescendant(node);
  const elapsed = useElapsed(running ? node.startedAt : null);

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(node.id)}
        className="w-full flex items-center gap-2 py-2.5 px-1 text-left hover:bg-gray-50 dark:hover:bg-zinc-800/60 rounded"
      >
        {(running || activeBelow) && <PulseDot />}
        <span
          className={clsx(
            "truncate text-sm",
            node.status === "DONE"
              ? "line-through text-zinc-400 dark:text-zinc-500"
              : "dark:text-white",
          )}
        >
          {node.title}
        </span>
        {node.children.length > 0 && (
          <span className="shrink-0 text-xs text-zinc-400 tabular-nums">
            {node.children.length}
          </span>
        )}
        {hasOverflow(node) && node.status !== "DONE" && <OverflowWarning />}
        <span className="ml-auto shrink-0 flex items-center gap-2">
          {running && <TimerChip seconds={elapsed} />}
          <RowTime node={node} extra={running ? elapsed : 0} />
          <ChevronRightIcon className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
        </span>
      </button>
    </li>
  );
}
