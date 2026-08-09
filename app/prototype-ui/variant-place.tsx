"use client";
// PROTOTYPE — throwaway. Variant 2: "Fokus".
// The thing Felix actually pictured: click a task → summary on top, the real
// subtree as a tree below. The improvement over today is the ONE axis that was
// never touched — indentation no longer carries depth:
//   - indent stops after INDENT_CAP levels; deeper rows share one gutter and
//     are told apart by a guide line + a depth marker, not by more margin
//   - any row is clickable to RE-ROOT: it becomes the page, breadcrumb grows,
//     indent resets to zero. You go deep by diving, not by scrolling right.

import { useState } from "react";
import clsx from "clsx";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PlayIcon,
  PlusIcon,
  StopIcon,
  ArrowsPointingInIcon,
} from "@heroicons/react/16/solid";
import { Heading } from "@/components/heading";
import {
  PNode,
  findPath,
  hasOverflow,
  hasActiveDescendant,
  countDescendants,
} from "./fakeTree";
import {
  PulseDot,
  OverflowWarning,
  RowTime,
  TimerChip,
  LessonPanel,
  useElapsed,
} from "./shared";
import { DoneMode, visibleChildren } from "./switcher-bar";

const INDENT_CAP = 3; // levels of real indent; beyond this the gutter is shared
const STEP = 18;

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
  const path = focusId ? findPath(roots, focusId) : null;
  const node = path?.[path.length - 1] ?? null;
  const kids = node ? node.children : roots;
  const shown = visibleChildren(kids, doneMode, showDone);

  const running = node?.status === "IN_PROGRESS";
  const elapsed = useElapsed(running ? node!.startedAt : null);

  return (
    <div className="pb-32">
      {/* path back — climbing out of a dive */}
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

      {/* ---- the summary ON TOP ---- */}
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
            {node.children.length} direkte · {countDescendants(node)} im ganzen
            Teilbaum · Ebene {(path?.length ?? 1) - 1}
          </p>
          <div className="mb-8">
            <LessonPanel node={node} />
          </div>
        </>
      ) : (
        <Heading className="mb-6">Zeiterfassung v2 (Prototyp-Daten)</Heading>
      )}

      {/* ---- the real tree BELOW ---- */}
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

      <div className="border-y border-zinc-100 dark:border-zinc-800 py-1">
        {shown.map((c) => (
          <SubRow
            key={c.id}
            node={c}
            depth={0}
            doneMode={doneMode}
            showDone={showDone}
            onDive={onOpen}
          />
        ))}
        {shown.length === 0 && (
          <p className="py-6 text-sm text-zinc-400">Keine Unteraufgaben.</p>
        )}
      </div>
    </div>
  );
}

/** A node in the subtree. Expands in place; title dives (re-roots). */
function SubRow({
  node,
  depth,
  doneMode,
  showDone,
  onDive,
}: {
  node: PNode;
  depth: number;
  doneMode: DoneMode;
  showDone: boolean;
  onDive: (id: string) => void;
}) {
  const running = node.status === "IN_PROGRESS";
  const activeBelow = hasActiveDescendant(node);
  const [expanded, setExpanded] = useState(activeBelow);
  const elapsed = useElapsed(running ? node.startedAt : null);

  const kids = visibleChildren(node.children, doneMode, showDone);
  const hasKids = node.children.length > 0;

  // indentation is CAPPED — this is the whole point
  const capped = Math.min(depth, INDENT_CAP);
  const overCap = depth > INDENT_CAP;

  return (
    <div>
      <div
        className="group flex items-center gap-1.5 rounded-md pr-2 py-1.5 hover:bg-gray-50 dark:hover:bg-zinc-800/60"
        style={{ paddingLeft: capped * STEP + 4 }}
      >
        {/* shared gutter marker once indent is capped */}
        {overCap && (
          <span className="mr-0.5 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 tabular-nums">
            {depth + 1}
          </span>
        )}

        <button
          type="button"
          onClick={() => hasKids && setExpanded((p) => !p)}
          className={clsx(
            "shrink-0 w-4 h-4 flex items-center justify-center text-zinc-400",
            !hasKids && "invisible",
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

        {/* title dives — re-root to this task */}
        <button
          type="button"
          onClick={() => onDive(node.id)}
          className={clsx(
            "truncate text-left text-sm hover:underline",
            node.status === "DONE"
              ? "line-through text-zinc-400 dark:text-zinc-500"
              : "dark:text-white",
          )}
          title="Öffnen (wird zur Seite)"
        >
          {node.title}
        </button>

        {hasKids && (
          <span className="shrink-0 text-xs text-zinc-400 tabular-nums">
            {node.children.length}
          </span>
        )}
        {hasOverflow(node) && node.status !== "DONE" && <OverflowWarning />}

        <span className="ml-auto shrink-0 flex items-center gap-2">
          {running && <TimerChip seconds={elapsed} />}
          <RowTime node={node} extra={running ? elapsed : 0} />
          <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              aria-label="Timer"
              className="p-1 rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-700"
            >
              <PlayIcon className="w-4 h-4" />
            </button>
            {hasKids && (
              <button
                type="button"
                onClick={() => onDive(node.id)}
                aria-label="Hierher tauchen"
                className="p-1 rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-700"
                title="Diese Aufgabe zur Seite machen"
              >
                <ArrowsPointingInIcon className="w-4 h-4" />
              </button>
            )}
          </span>
        </span>
      </div>

      {expanded &&
        kids.map((c) => (
          <SubRow
            key={c.id}
            node={c}
            depth={depth + 1}
            doneMode={doneMode}
            showDone={showDone}
            onDive={onDive}
          />
        ))}
    </div>
  );
}
