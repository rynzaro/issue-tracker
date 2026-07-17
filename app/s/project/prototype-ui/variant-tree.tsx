"use client";
// PROTOTYPE — throwaway. Variant 1: the whole tree at once, indent fixed.
// Answers: can deep nesting survive if indent shrinks to a guide line and the
// buttons stop shouting? Rows are dumb on purpose (no own/subs split).

import { useState } from "react";
import clsx from "clsx";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PlayIcon,
  PlusIcon,
  StopIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/16/solid";
import { useElapsedTimer } from "@/lib/hooks";
import { PNode, hasOverflow, hasActiveDescendant } from "./fakeTree";
import { PulseDot, OverflowWarning, RowTime, TimerChip } from "./shared";
import { DoneMode, visibleChildren } from "./switcher-bar";

export default function VariantTree({
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
  return (
    <div className="pb-32">
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
        Ganzer Baum. Einrückung nur noch als dünne Linie, Buttons erst beim
        Überfahren. Klick auf den Titel öffnet den Ort der Aufgabe.
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
  const [expanded, setExpanded] = useState(activeBelow || depth === 0);
  const [showDoneHere, setShowDoneHere] = useState(false);
  const elapsed = useElapsedTimer(running ? node.startedAt : null);

  const kids = node.children;
  const doneKids = kids.filter((c) => c.status === "DONE");
  const shownKids = visibleChildren(kids, doneMode, showDone);

  return (
    <div>
      <div
        className={clsx(
          "group flex items-center gap-2 rounded-md pr-2 py-1.5",
          "hover:bg-gray-50 dark:hover:bg-zinc-800/60",
        )}
        style={{ paddingLeft: depth * 14 + 4 }}
      >
        {/* thin guide line instead of ml-4 per level */}
        {depth > 0 && (
          <span
            aria-hidden
            className="absolute pointer-events-none border-l border-zinc-200 dark:border-zinc-700"
            style={{ marginLeft: -10, height: 28 }}
          />
        )}

        <button
          type="button"
          onClick={() => kids.length > 0 && setExpanded((p) => !p)}
          className={clsx(
            "shrink-0 w-4 h-4 flex items-center justify-center text-zinc-400",
            kids.length === 0 && "invisible",
          )}
          aria-label={expanded ? "Zuklappen" : "Aufklappen"}
        >
          {expanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
        </button>

        {(running || activeBelow) && <PulseDot />}

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

        {!expanded && kids.length > 0 && (
          <span className="shrink-0 text-xs text-zinc-400 tabular-nums">
            {kids.length}
          </span>
        )}
        {hasOverflow(node) && node.status !== "DONE" && <OverflowWarning />}

        <span className="ml-auto shrink-0 flex items-center gap-2">
          {running && <TimerChip seconds={elapsed} />}
          <RowTime node={node} extra={running ? elapsed : 0} />
          {/* rare actions hide until hover; play/plus are the common ones */}
          <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
            <IconBtn label={running ? "Timer stoppen" : "Timer starten"}>
              {running ? (
                <StopIcon className="w-4 h-4" />
              ) : (
                <PlayIcon className="w-4 h-4" />
              )}
            </IconBtn>
            <IconBtn label="Unteraufgabe">
              <PlusIcon className="w-4 h-4" />
            </IconBtn>
            <IconBtn label="Mehr">
              <EllipsisHorizontalIcon className="w-4 h-4" />
            </IconBtn>
          </span>
        </span>
      </div>

      {expanded && (
        <>
          {shownKids.map((c) => (
            <Row
              key={c.id}
              node={c}
              depth={depth + 1}
              doneMode={doneMode}
              showDone={showDone}
              onOpen={onOpen}
            />
          ))}

          {/* per-level mode: one of these buttons at EVERY level. That is the
              thing to feel — count them on the way down the spine. */}
          {doneMode === "perLevel" && doneKids.length > 0 && (
            <div style={{ paddingLeft: (depth + 1) * 14 + 24 }}>
              <button
                type="button"
                onClick={() => setShowDoneHere((p) => !p)}
                className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 py-1"
              >
                {showDoneHere ? (
                  <ChevronDownIcon className="w-3 h-3" />
                ) : (
                  <ChevronRightIcon className="w-3 h-3" />
                )}
                Abgeschlossen ({doneKids.length})
              </button>
              {showDoneHere &&
                doneKids.map((c) => (
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
          )}
        </>
      )}
    </div>
  );
}

function IconBtn({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="p-1 rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-700"
    >
      {children}
    </button>
  );
}
