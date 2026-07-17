"use client";
// PROTOTYPE — throwaway. Variant 3: "Flach" — no indentation at all.
// The radical test: does depth even need indentation? Here the focused task's
// whole subtree is flattened into one list. Hierarchy is carried by a faint
// ancestor-path chip on each row (Auth › Login › …), not by margin. Deep and
// shallow rows sit at the same left edge, so nothing ever gets squeezed.
//
// Same summary-on-top as Fokus; only the "tree below" is rendered differently,
// so the two variants isolate exactly one question: indent vs no-indent.

import clsx from "clsx";
import { PlayIcon, PlusIcon, StopIcon } from "@heroicons/react/16/solid";
import { Heading } from "@/components/heading";
import { ChevronRightIcon } from "@heroicons/react/16/solid";
import {
  PNode,
  findPath,
  hasOverflow,
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

type Flat = { node: PNode; ancestors: PNode[] };

/** depth-first flatten of a subtree, carrying each node's ancestor chain */
function flatten(
  children: PNode[],
  doneMode: DoneMode,
  showDone: boolean,
  ancestors: PNode[] = [],
): Flat[] {
  const out: Flat[] = [];
  for (const c of visibleChildren(children, doneMode, showDone)) {
    out.push({ node: c, ancestors });
    if (c.children.length > 0) {
      out.push(...flatten(c.children, doneMode, showDone, [...ancestors, c]));
    }
  }
  return out;
}

export default function VariantFlat({
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
  const rows = flatten(kids, doneMode, showDone);

  const running = node?.status === "IN_PROGRESS";
  const elapsed = useElapsed(running ? node!.startedAt : null);

  return (
    <div className="pb-32">
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
            {node.children.length} direkte · {countDescendants(node)} im ganzen
            Teilbaum
          </p>
          <div className="mb-8">
            <LessonPanel node={node} />
          </div>
        </>
      ) : (
        <Heading className="mb-6">Zeiterfassung v2 (Prototyp-Daten)</Heading>
      )}

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold dark:text-white">
          Ganzer Teilbaum ({rows.length}) — ohne Einrückung
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
        {rows.map(({ node: n, ancestors }) => (
          <FlatRow
            key={n.id}
            node={n}
            ancestors={ancestors}
            onOpen={onOpen}
          />
        ))}
        {rows.length === 0 && (
          <li className="py-6 text-sm text-zinc-400">Keine Unteraufgaben.</li>
        )}
      </ul>
    </div>
  );
}

function FlatRow({
  node,
  ancestors,
  onOpen,
}: {
  node: PNode;
  ancestors: PNode[];
  onOpen: (id: string) => void;
}) {
  const running = node.status === "IN_PROGRESS";
  const elapsed = useElapsed(running ? node.startedAt : null);
  // the path chip carries hierarchy instead of indentation
  const chip = ancestors.map((a) => a.title).join(" › ");

  return (
    <li className="group flex items-center gap-2 py-2 px-1 hover:bg-gray-50 dark:hover:bg-zinc-800/60 rounded">
      {running && <PulseDot />}
      <div className="min-w-0 flex-1">
        {chip && (
          <div className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">
            {chip}
          </div>
        )}
        <button
          type="button"
          onClick={() => onOpen(node.id)}
          className={clsx(
            "block truncate text-left text-sm hover:underline",
            node.status === "DONE"
              ? "line-through text-zinc-400 dark:text-zinc-500"
              : "dark:text-white",
          )}
        >
          {node.title}
          {node.children.length > 0 && (
            <span className="ml-1.5 text-xs text-zinc-400">
              {node.children.length}
            </span>
          )}
        </button>
      </div>
      {hasOverflow(node) && node.status !== "DONE" && <OverflowWarning />}
      <span className="shrink-0 flex items-center gap-2">
        {running && <TimerChip seconds={elapsed} />}
        <RowTime node={node} extra={running ? elapsed : 0} />
        <span className="opacity-0 group-hover:opacity-100">
          <PlayIcon className="w-4 h-4 text-zinc-400" />
        </span>
      </span>
    </li>
  );
}
