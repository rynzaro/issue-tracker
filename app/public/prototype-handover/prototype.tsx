"use client";

// PROTOTYPE — throwaway. See page.tsx for the question this answers.

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { Heading, Subheading } from "@/components/heading";
import { SecondaryText } from "@/components/text";
import { Divider } from "@/components/divider";
import { PrototypeSwitcher } from "@/components/prototype-switcher";
import { formatTime } from "@/lib/util";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  LockClosedIcon,
  ArrowRightCircleIcon,
} from "@heroicons/react/16/solid";

/* ---------------------------------------------------------------- stub data */

type PNode = {
  id: string;
  title: string;
  /** minutes */
  estimate?: number;
  /** seconds — what the CEO's tree would roll up */
  tracked: number;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  /** set when this node was handed to someone */
  handedTo?: string;
  /** who logged the time (only knowable in variant C) */
  workedBy?: string;
  children: PNode[];
};

// The CEO's project. "Backend Rewrite" was handed to Sarah (CTO), who handed
// "DB Migration" on to Tom — the chain case.
const project = {
  name: "Website Relaunch",
  tasks: [
    {
      id: "t1",
      title: "Backend Rewrite",
      estimate: 40 * 60,
      tracked: 63 * 3600 + 20 * 60,
      status: "IN_PROGRESS",
      handedTo: "Sarah (CTO)",
      children: [
        {
          id: "t1a",
          title: "Auth Service",
          estimate: 12 * 60,
          tracked: 21 * 3600 + 40 * 60,
          status: "DONE",
          workedBy: "Sarah",
          children: [],
        },
        {
          id: "t1b",
          title: "DB Migration",
          estimate: 10 * 60,
          tracked: 28 * 3600 + 10 * 60,
          status: "IN_PROGRESS",
          handedTo: "Tom (Senior)",
          workedBy: "Tom",
          children: [
            {
              id: "t1b1",
              title: "Schema-Diff Skript",
              estimate: 4 * 60,
              tracked: 11 * 3600 + 5 * 60,
              status: "DONE",
              workedBy: "Tom",
              children: [],
            },
            {
              id: "t1b2",
              title: "Rollback testen",
              estimate: 3 * 60,
              tracked: 17 * 3600 + 5 * 60,
              status: "IN_PROGRESS",
              workedBy: "Jana (Junior)",
              children: [],
            },
          ],
        },
        {
          id: "t1c",
          title: "API Gateway",
          estimate: 8 * 60,
          tracked: 13 * 3600 + 30 * 60,
          status: "IN_PROGRESS",
          workedBy: "Sarah",
          children: [],
        },
      ],
    },
    {
      id: "t2",
      title: "Frontend Redesign",
      estimate: 24 * 60,
      tracked: 9 * 3600 + 15 * 60,
      status: "IN_PROGRESS",
      children: [
        {
          id: "t2a",
          title: "Design System",
          estimate: 8 * 60,
          tracked: 7 * 3600 + 50 * 60,
          status: "DONE",
          children: [],
        },
        {
          id: "t2b",
          title: "Component Library",
          estimate: 16 * 60,
          tracked: 1 * 3600 + 25 * 60,
          status: "IN_PROGRESS",
          children: [],
        },
      ],
    },
  ] satisfies PNode[],
};

const variants = [
  { key: "A", name: "Nur Status" },
  { key: "B", name: "Nur Zeit rollt hoch" },
  { key: "C", name: "Alles sichtbar" },
];

const captions: Record<string, string> = {
  A: "(a) Nur Status. Der CEO sieht fertig / nicht fertig. Seine Schätzung von 40:00 wird nie geprüft — die übergebene Arbeit verlässt die Analyse.",
  B: "(b) Nur Zeit rollt hoch. Der CEO sieht 63:20 gegen 40:00 geschätzt. Er lernt WIE VIEL, nie WIE. Keine Namen, keine Unteraufgaben.",
  C: "(c) Alles. Der CEO sieht Sarahs Baum — und Toms und Janas, zwei Ebenen tiefer. Das ist das heutige Modell.",
};

/* ------------------------------------------------------------------- shared */

function delta(tracked: number, estimateMin?: number) {
  if (!estimateMin) return null;
  const est = estimateMin * 60;
  const pct = Math.round(((tracked - est) / est) * 100);
  return pct;
}

function TimeLine({ tracked, estimate }: { tracked: number; estimate?: number }) {
  const pct = delta(tracked, estimate);
  return (
    <SecondaryText>
      {formatTime(tracked, "sec", "HH:MM", true)}
      {estimate != null && <> / {formatTime(estimate, "min", "HH:MM", true)}</>}
      {pct != null && pct > 0 && (
        <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
          +{pct}%
        </span>
      )}
    </SecondaryText>
  );
}

function Row({
  children,
  indent = false,
  muted = false,
  onClick,
}: {
  children: React.ReactNode;
  indent?: boolean;
  muted?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      onClick={onClick}
      className={clsx(
        "flex select-none items-center justify-between gap-2 rounded-lg border-l-4 py-2 pl-4 pr-2 dark:text-white",
        indent && "ml-4",
        muted
          ? "border-zinc-200 dark:border-zinc-700"
          : "border-gray-300 dark:border-gray-600",
        onClick && "hover:bg-gray-50 dark:hover:bg-zinc-800",
      )}
    >
      {children}
    </div>
  );
}

function HandedBadge({ to }: { to: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      <ArrowRightCircleIcon className="h-3.5 w-3.5" />
      An {to} übergeben
    </span>
  );
}

/** The CEO's own branch — identical in every variant. The control. */
function OwnBranch({ node }: { node: PNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-8 flex flex-col gap-4 font-semibold">
      <Row onClick={() => setOpen((p) => !p)}>
        <div>
          <Subheading level={4} className="flex items-center">
            {node.title}
            {open ? (
              <ChevronUpIcon className="h-6 w-6" />
            ) : (
              <ChevronDownIcon className="h-6 w-6" />
            )}
          </Subheading>
          <TimeLine tracked={node.tracked} estimate={node.estimate} />
        </div>
      </Row>
      {open &&
        node.children.map((c) => (
          <div key={c.id} className="ml-4 flex flex-col gap-4">
            <Row indent>
              <div>
                <Subheading level={4}>
                  {c.status === "DONE" ? (
                    <span className="line-through opacity-50">{c.title}</span>
                  ) : (
                    c.title
                  )}
                </Subheading>
                <TimeLine tracked={c.tracked} estimate={c.estimate} />
              </div>
            </Row>
          </div>
        ))}
    </div>
  );
}

/* ----------------------------------------------------------------- variants */

/** (a) Status only — the handed node is opaque. No numbers, nothing to expand. */
function VariantA({ node }: { node: PNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 font-semibold">
      <Row muted>
        <div>
          <Subheading level={4} className="flex items-center gap-2">
            <span className="opacity-60">{node.title}</span>
            <HandedBadge to={node.handedTo!} />
          </Subheading>
          <SecondaryText>
            <span className="inline-flex items-center gap-1">
              <LockClosedIcon className="h-3.5 w-3.5" />
              In Arbeit — keine Ist-Zeit
            </span>
          </SecondaryText>
        </div>
        <span className="pr-2 font-mono text-sm text-zinc-400 dark:text-zinc-500">
          — / {formatTime(node.estimate!, "min", "HH:MM", true)}
        </span>
      </Row>
      <p className="ml-4 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
        Deine Schätzung von {formatTime(node.estimate!, "min", "HH:MM", true)}{" "}
        bleibt für immer ungeprüft.
      </p>
    </div>
  );
}

/** (b) Rolled-up time only — one summary strip, nothing to expand. */
function VariantB({ node }: { node: PNode }) {
  const est = node.estimate! * 60;
  const overshoot = Math.min(100, ((node.tracked - est) / node.tracked) * 100);
  return (
    <div className="mb-8 flex flex-col gap-4 font-semibold">
      <Row muted>
        <div className="w-full">
          <Subheading level={4} className="flex items-center gap-2">
            {node.title}
            <HandedBadge to={node.handedTo!} />
          </Subheading>
          <TimeLine tracked={node.tracked} estimate={node.estimate} />
          <div className="mt-2 mr-4 h-2 w-full max-w-sm overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div className="flex h-full">
              <div
                className="h-full bg-zinc-500 dark:bg-zinc-400"
                style={{ width: `${100 - overshoot}%` }}
              />
              <div
                className="h-full bg-red-400 dark:bg-red-500"
                style={{ width: `${overshoot}%` }}
              />
            </div>
          </div>
          <SecondaryText>
            <span className="text-xs">geschätzt · Überlauf</span>
          </SecondaryText>
        </div>
      </Row>
      <p className="ml-4 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
        Du weißt, dass du um 58 % daneben lagst. Du weißt nicht, woran es lag —
        und Sarahs Baum bleibt ihrer.
      </p>
    </div>
  );
}

/** (c) Everything — today's model. The whole delegated subtree, incl. the chain. */
function VariantC({ node }: { node: PNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 font-semibold">
      <Row>
        <div>
          <Subheading level={4} className="flex items-center gap-2">
            {node.title}
            <HandedBadge to={node.handedTo!} />
            <ChevronUpIcon className="h-6 w-6" />
          </Subheading>
          <TimeLine tracked={node.tracked} estimate={node.estimate} />
        </div>
      </Row>
      {node.children.map((c) => (
        <SubTree key={c.id} node={c} depth={1} />
      ))}
    </div>
  );
}

function SubTree({ node, depth }: { node: PNode; depth: number }) {
  return (
    <div className="ml-4 flex flex-col gap-4">
      <Row indent>
        <div>
          <Subheading level={4} className="flex items-center gap-2">
            {node.status === "DONE" ? (
              <span className="line-through opacity-50">{node.title}</span>
            ) : (
              node.title
            )}
            {node.handedTo && <HandedBadge to={node.handedTo} />}
          </Subheading>
          <TimeLine tracked={node.tracked} estimate={node.estimate} />
          {node.workedBy && (
            <SecondaryText>
              <span className="text-xs">Zeit erfasst von {node.workedBy}</span>
            </SecondaryText>
          )}
        </div>
      </Row>
      {node.children.map((c) => (
        <SubTree key={c.id} node={c} depth={depth + 1} />
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------- page */

export default function HandoverPrototype() {
  const searchParams = useSearchParams();
  const variant = searchParams.get("variant") ?? "A";

  const handed = project.tasks[0];
  const own = project.tasks[1];

  return (
    <div className="mx-auto flex max-w-3xl flex-col p-8 pb-40">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
        Prototyp · Sicht des CEO (Projekt-Eigentümer)
      </p>
      <Heading>{project.name}</Heading>
      <Divider className="my-2" />

      {variant === "A" && <VariantA node={handed} />}
      {variant === "B" && <VariantB node={handed} />}
      {variant === "C" && <VariantC node={handed} />}

      <OwnBranch node={own} />

      <PrototypeSwitcher
        variants={variants}
        current={variant}
        caption={captions[variant]}
      />
    </div>
  );
}
