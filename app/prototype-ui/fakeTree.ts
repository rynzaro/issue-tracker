// PROTOTYPE — throwaway. Not production. Deterministic fake tree, in memory only.
// Real data has no own-time (project.service.ts rolls totalTimeSpent up and
// overwrites it), so the own-vs-subs lesson can't be shown from it. Fake it here.

export type PStatus = "OPEN" | "IN_PROGRESS" | "DONE";

export type PNode = {
  id: string;
  title: string;
  ownTime: number; // seconds spent directly on this task
  estimate: number | null; // minutes
  status: PStatus;
  startedAt: Date | null; // set on the one IN_PROGRESS task
  children: PNode[];
};

// deterministic pseudo-random so variants show identical data
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const WORDS = [
  "Login",
  "Registrierung",
  "Passwort zurücksetzen",
  "Session",
  "Token",
  "Datenbank",
  "Migration",
  "Schema",
  "Index",
  "Query",
  "Formular",
  "Validierung",
  "Fehlermeldung",
  "Ladezustand",
  "Timer",
  "Zeiterfassung",
  "Bericht",
  "Auswertung",
  "Diagramm",
  "Export",
  "Navigation",
  "Sidebar",
  "Dialog",
  "Tabelle",
  "Filter",
];

const PREFIX = [
  "Bauen",
  "Umbauen",
  "Testen",
  "Aufräumen",
  "Prüfen",
  "Entwerfen",
  "Verdrahten",
];

/**
 * One deep spine (10 levels) so deep nesting is actually testable, plus
 * breadth elsewhere. The running timer sits 7 levels down on purpose — that is
 * the case the current UI handles worst.
 */
export function buildFakeTree(): PNode[] {
  const rand = rng(42);
  let n = 0;
  const id = () => `p${n++}`;

  function make(
    title: string,
    depth: number,
    maxDepth: number,
    breadth: number,
  ): PNode {
    const kids: PNode[] = [];
    if (depth < maxDepth) {
      const count = Math.max(1, Math.round(rand() * breadth));
      for (let i = 0; i < count; i++) {
        const w = WORDS[Math.floor(rand() * WORDS.length)];
        const p = PREFIX[Math.floor(rand() * PREFIX.length)];
        kids.push(
          make(
            `${p}: ${w}`,
            depth + 1,
            maxDepth,
            Math.max(1, breadth - 1),
          ),
        );
      }
    }
    const done = kids.length === 0 && rand() < 0.35;
    return {
      id: id(),
      title,
      ownTime: Math.round(rand() * 5400), // 0–90 min of own work
      estimate: rand() < 0.85 ? Math.round(rand() * 180) + 15 : null,
      status: done ? "DONE" : "OPEN",
      startedAt: null,
      children: kids,
    };
  }

  // the deep spine: 10 levels, single child each, so depth is unambiguous
  function spine(depth: number): PNode {
    const titles = [
      "Zeiterfassung v2",
      "Auswertung",
      "Schätzfehler-Analyse",
      "Scope vs. Effort",
      "Baseline-Checkpoint",
      "Kinder-Snapshot",
      "existedAtBaseline",
      "Migration schreiben",
      "Rückwärts-Test",
      "Edge-Case: leerer Baum",
    ];
    const node: PNode = {
      id: id(),
      title: titles[depth] ?? `Ebene ${depth}`,
      ownTime: Math.round(600 + rand() * 3000),
      estimate: 60 + Math.round(rand() * 120),
      status: "OPEN",
      startedAt: null,
      children: [],
    };
    if (depth < titles.length - 1) {
      node.children.push(spine(depth + 1));
      // a little breadth so the spine is not a bare line
      if (depth < 4) {
        node.children.push(
          make(`Nebenarbeit Ebene ${depth}`, depth + 1, depth + 3, 2),
        );
      }
    }
    return node;
  }

  const deep = spine(0);

  // put the running timer 7 levels down the spine
  let cur: PNode = deep;
  for (let i = 0; i < 7; i++) cur = cur.children[0];
  cur.status = "IN_PROGRESS";
  cur.startedAt = new Date(Date.now() - 1000 * 60 * 23); // running 23 min

  return [
    deep,
    make("Onboarding-Flow", 0, 3, 3),
    make("Rechnungen", 0, 4, 3),
    make("Aufräumen: Altlasten", 0, 2, 4),
  ];
}

// ---- derived values (the real service can't give us these today) ----

export function subsTime(n: PNode): number {
  return n.children.reduce((s, c) => s + totalTime(c), 0);
}

export function totalTime(n: PNode): number {
  return n.ownTime + subsTime(n);
}

export function subsEstimate(n: PNode): number {
  return n.children.reduce((s, c) => s + (c.estimate ?? 0), 0);
}

export function hasOverflow(n: PNode): boolean {
  return n.estimate != null && subsEstimate(n) > n.estimate;
}

export function countDescendants(n: PNode): number {
  return n.children.reduce((s, c) => s + 1 + countDescendants(c), 0);
}

export function hasActiveDescendant(n: PNode): boolean {
  return n.children.some((c) => c.status === "IN_PROGRESS" || hasActiveDescendant(c));
}

/** path from a root down to id, inclusive; null if not found */
export function findPath(roots: PNode[], id: string): PNode[] | null {
  for (const r of roots) {
    if (r.id === id) return [r];
    const sub = findPath(r.children, id);
    if (sub) return [r, ...sub];
  }
  return null;
}

export function findRunning(roots: PNode[]): PNode[] | null {
  for (const r of roots) {
    if (r.status === "IN_PROGRESS") return [r];
    const sub = findRunning(r.children);
    if (sub) return [r, ...sub];
  }
  return null;
}

/**
 * The lesson: where did the overrun come from?
 * scope  = time on sub-tasks (work that was not in the estimate)
 * effort = own time vs own estimate (misjudged the work itself)
 */
export function lesson(n: PNode) {
  const own = n.ownTime;
  const subs = subsTime(n);
  const total = own + subs;
  const planned = (n.estimate ?? 0) * 60;
  const overrun = total - planned;
  return {
    own,
    subs,
    total,
    planned,
    overrun,
    effortError: own - planned, // >0 = the task itself took longer than planned
    scopeError: subs, // all sub-task time is scope that was not planned here
    dominant: subs > Math.max(0, own - planned) ? ("scope" as const) : ("effort" as const),
  };
}
