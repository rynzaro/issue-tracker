"use client";
// PROTOTYPE — throwaway. Variant 4: the running timer is the centre of gravity.
// One timer per user (ADR-0016), so the app always has exactly one "now".
// The running task is pinned at the top with its full ancestor path, always
// visible, no matter how deep it sits. The tree below is secondary.

import { useState } from "react";
import clsx from "clsx";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PlayIcon,
  StopIcon,
  ArrowUpIcon,
} from "@heroicons/react/16/solid";
import { useElapsedTimer } from "@/lib/hooks";
import { PNode, findRunning, hasActiveDescendant, hasOverflow } from "./fakeTree";
import { PulseDot, OverflowWarning, RowTime, hhmm } from "./shared";
import { DoneMode, visibleChildren } from "./switcher-bar";

export default function VariantTimer({
  roots,
  doneMode,
  showDone,
  onOpen,
}: {
  roots: PNode[];
  doneMode: DoneMode;
  showDone: boolean;
  onOpen: (id: string) => void;
}) {
  const path = findRunning(roots);
  const running = path?.[path.length - 1] ?? null;
  const elapsed = useElapsedTimer(running?.startedAt ?? null);

  return (
    <div className="pb-32">
      {/* pinned: the one thing you are doing right now */}
      {running && path && (
        <div className="sticky top-0 z-10 -mx-2 px-2 pt-2 pb-3 bg-white dark:bg-zinc-900">
          <div className="rounded-xl border border-zinc-300 dark:border-zinc-600 p-4">
            {/* the full path — this is what a pill in the navbar can't give you */}
            <div className="flex items-center gap-1 flex-wrap mb-2">
              {path.slice(0, -1).map((p) => (
                <span key={p.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onOpen(p.id)}
                    className="text-xs text-zinc-500 dark:text-zinc-400 hover:underline truncate max-w-[14ch]"
                  >
                    {p.title}
                  </button>
                  <ChevronRightIcon className="w-3 h-3 text-zinc-300 dark:text-zinc-600" />
                </span>
              ))}
              <span className="text-xs text-zinc-400">Ebene {path.length - 1}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center min-w-0">
                <PulseDot />
                <span className="truncate text-lg font-semibold dark:text-white">
                  {running.title}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono tabular-nums text-2xl dark:text-white">
                  {hhmm(elapsed)}
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 dark:bg-white px-3 py-2 text-sm text-white dark:text-zinc-900"
                >
                  <StopIcon className="w-4 h-4" />
                  Stopp
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
              <span>
                heute an dieser Aufgabe:{" "}
                <span className="tabular-nums dark:text-zinc-300">
                  {hhmm(running.ownTime + elapsed)}
                </span>
              </span>
              {running.estimate != null && (
                <span>
                  geplant:{" "}
                  <span className="tabular-nums dark:text-zinc-300">
                    {hhmm(running.estimate * 60)}
                  </span>
                </span>
              )}
              <button
                type="button"
                onClick={() => onOpen(running.id)}
                className="ml-auto hover:underline"
              >
                Ort öffnen →
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-sm text-zinc-500 dark:text-zinc-400 my-4">
        Der laufende Timer ist oben angepinnt — mit ganzem Weg, egal wie tief er
        sitzt. Der Baum darunter ist Nebensache und startet zugeklappt.
      </p>

      {roots.map((r) => (
        <Row
          key={r.id}
          node={r}
          depth={0}
          doneMode={doneMode}
          showDone={showDone}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

function Row({
  node,
  depth,
  doneMode,
  showDone,
  onOpen,
}: {
  node: PNode;
  depth: number;
  doneMode: DoneMode;
  showDone: boolean;
  onOpen: (id: string) => void;
}) {
  const running = node.status === "IN_PROGRESS";
  const activeBelow = hasActiveDescendant(node);
  // collapsed by default — the pinned card already tells you where you are
  const [expanded, setExpanded] = useState(false);

  const kids = visibleChildren(node.children, doneMode, showDone);

  return (
    <div>
      <div
        className="group flex items-center gap-2 rounded-md pr-2 py-1.5 hover:bg-gray-50 dark:hover:bg-zinc-800/60"
        style={{ paddingLeft: depth * 14 + 4 }}
      >
        <button
          type="button"
          onClick={() => node.children.length > 0 && setExpanded((p) => !p)}
          className={clsx(
            "shrink-0 w-4 h-4 flex items-center justify-center text-zinc-400",
            node.children.length === 0 && "invisible",
          )}
          aria-label={expanded ? "Zuklappen" : "Aufklappen"}
        >
          {expanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
        </button>

        {activeBelow && !running && (
          <span
            title="Der laufende Timer sitzt hier drunter"
            className="shrink-0"
          >
            <ArrowUpIcon className="w-3 h-3 text-zinc-400 rotate-180" />
          </span>
        )}
        {running && <PulseDot />}

        <button
          type="button"
          onClick={() => onOpen(node.id)}
          className={clsx(
            "truncate text-left text-sm hover:underline",
            node.status === "DONE"
              ? "line-through text-zinc-400 dark:text-zinc-500"
              : "dark:text-white",
            depth === 0 && "font-semibold",
          )}
        >
          {node.title}
        </button>
        {hasOverflow(node) && node.status !== "DONE" && <OverflowWarning />}

        <span className="ml-auto shrink-0 flex items-center gap-2">
          <RowTime node={node} />
          <span className="opacity-0 group-hover:opacity-100">
            <PlayIcon className="w-4 h-4 text-zinc-400" />
          </span>
        </span>
      </div>

      {expanded &&
        kids.map((c) => (
          <Row
            key={c.id}
            node={c}
            depth={depth + 1}
            doneMode={doneMode}
            showDone={showDone}
            onOpen={onOpen}
          />
        ))}
    </div>
  );
}
