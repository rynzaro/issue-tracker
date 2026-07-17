"use client";
// PROTOTYPE — throwaway. Variant 3: Miller columns (like the Finder).
// Every level is its own column. Depth goes sideways instead of down, so the
// title never gets squeezed. You see your whole path at once — that is the
// thing the other variants can't do.

import { useRef, useEffect } from "react";
import clsx from "clsx";
import { PlayIcon, PlusIcon } from "@heroicons/react/16/solid";
import { PNode, findPath, hasOverflow, hasActiveDescendant } from "./fakeTree";
import { PulseDot, OverflowWarning, RowTime, TimerChip, LessonPanel, useElapsed } from "./shared";
import { DoneMode, visibleChildren } from "./switcher-bar";

export default function VariantColumns({
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
  const scroller = useRef<HTMLDivElement>(null);
  const path = focusId ? findPath(roots, focusId) : null;
  const selected = path ?? [];

  // columns: roots, then the children of each task on the path
  const columns: PNode[][] = [roots, ...selected.map((n) => n.children)];
  const visible = columns.filter((c, i) => i === 0 || c.length > 0);
  const leaf = selected[selected.length - 1] ?? null;

  useEffect(() => {
    scroller.current?.scrollTo({
      left: scroller.current.scrollWidth,
      behavior: "smooth",
    });
  }, [focusId]);

  return (
    <div className="pb-32">
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
        Jede Ebene ist eine Spalte. Tiefe geht nach rechts, nicht nach innen —
        der Titel wird nie gequetscht, und der ganze Weg bleibt sichtbar.
      </p>

      <div
        ref={scroller}
        className="flex gap-px overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-700"
        style={{ height: "60vh" }}
      >
        {visible.map((col, i) => (
          <Column
            key={i}
            nodes={col}
            selectedId={selected[i]?.id ?? null}
            doneMode={doneMode}
            showDone={showDone}
            onOpen={onOpen}
          />
        ))}

        {/* last column: the leaf's place, with the lesson */}
        {leaf && leaf.children.length === 0 && (
          <div className="w-80 shrink-0 overflow-y-auto bg-white dark:bg-zinc-900 p-4">
            <div className="text-sm font-semibold mb-3 dark:text-white">
              {leaf.title}
            </div>
            <LessonPanel node={leaf} />
          </div>
        )}
      </div>
    </div>
  );
}

function Column({
  nodes,
  selectedId,
  doneMode,
  showDone,
  onOpen,
}: {
  nodes: PNode[];
  selectedId: string | null;
  doneMode: DoneMode;
  showDone: boolean;
  onOpen: (id: string) => void;
}) {
  const shown = visibleChildren(nodes, doneMode, showDone);

  return (
    <div className="w-72 shrink-0 overflow-y-auto bg-white dark:bg-zinc-900">
      <ul className="py-1">
        {shown.map((n) => (
          <ColRow
            key={n.id}
            node={n}
            selected={n.id === selectedId}
            onOpen={onOpen}
          />
        ))}
        {shown.length === 0 && (
          <li className="px-3 py-2 text-xs text-zinc-400">leer</li>
        )}
      </ul>
      <button
        type="button"
        className="flex items-center gap-1 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
      >
        <PlusIcon className="w-3 h-3" />
        Neu
      </button>
    </div>
  );
}

function ColRow({
  node,
  selected,
  onOpen,
}: {
  node: PNode;
  selected: boolean;
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
        className={clsx(
          "group w-full flex items-center gap-1.5 px-3 py-1.5 text-left",
          selected
            ? "bg-zinc-800 dark:bg-zinc-700"
            : "hover:bg-gray-50 dark:hover:bg-zinc-800/60",
        )}
      >
        {(running || activeBelow) && <PulseDot />}
        <span
          className={clsx(
            "truncate text-sm",
            selected
              ? "text-white"
              : node.status === "DONE"
                ? "line-through text-zinc-400 dark:text-zinc-500"
                : "dark:text-white",
          )}
        >
          {node.title}
        </span>
        {hasOverflow(node) && node.status !== "DONE" && <OverflowWarning />}
        <span className="ml-auto shrink-0 flex items-center gap-1.5">
          {running ? (
            <TimerChip seconds={elapsed} />
          ) : (
            <span className="opacity-0 group-hover:opacity-100">
              <PlayIcon
                className={clsx(
                  "w-3.5 h-3.5",
                  selected ? "text-zinc-300" : "text-zinc-400",
                )}
              />
            </span>
          )}
          {!running && (
            <span className={clsx(selected && "text-zinc-300")}>
              <RowTime node={node} />
            </span>
          )}
          {node.children.length > 0 && (
            <span
              className={clsx(
                "text-xs",
                selected ? "text-zinc-400" : "text-zinc-300 dark:text-zinc-600",
              )}
            >
              ›
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
