"use client";

import { TaskNode } from "@/lib/schema/task";
import { TaskParentInfo } from "@/lib/services/project.service";
import { formatTime } from "@/lib/util";
import {
  unarchiveTaskAction,
  restoreDeletedTaskAction,
} from "@/lib/actions/task.actions";
import { useState } from "react";
import IconButton from "@/components/iconButton";
import { Subheading } from "@/components/heading";
import { SecondaryText } from "@/components/text";
import { ArchiveBoxXMarkIcon, TrashIcon } from "@heroicons/react/16/solid";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/16/solid";
import {
  Alert,
  AlertActions,
  AlertDescription,
  AlertTitle,
} from "@/components/alert";
import { Button } from "@/components/button";
import clsx from "clsx";
import {
  ErrorToast,
  SuccessToast,
  useToast,
} from "@/lib/notification/toastProvider";

/** Crossed-out trash icon for undelete */
function TrashXIcon({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        "relative inline-flex items-center justify-center",
        className,
      )}
    >
      <TrashIcon className="w-5 h-5" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="block w-[120%] h-0.5 bg-current -rotate-45 rounded" />
      </span>
    </span>
  );
}

type RestoreCheck = {
  canRestore: boolean;
  description: string;
  warning?: string;
  affectedAncestors: TaskParentInfo[];
};

function getAffectedSummary(affectedAncestors: TaskParentInfo[]): string {
  if (affectedAncestors.length === 0) {
    return "";
  }

  return `Diese Aktion stellt diese Aufgabe und ${affectedAncestors.length} weitere Aufgabe${affectedAncestors.length > 1 ? "n" : ""} wieder her.`;
}

function collectAncestors(
  task: TaskNode,
  parentMap: Record<string, TaskParentInfo>,
): TaskParentInfo[] {
  const ancestors: TaskParentInfo[] = [];
  const visited = new Set<string>();
  let currentParentId = task.parentId;

  while (currentParentId && !visited.has(currentParentId)) {
    visited.add(currentParentId);
    const parent = parentMap[currentParentId];
    if (!parent) break;
    ancestors.push(parent);
    currentParentId = parent.parentId;
  }

  return ancestors;
}

function getRestoreCheck(
  task: TaskNode,
  mode: "archived" | "deleted",
  parentMap: Record<string, TaskParentInfo>,
): RestoreCheck {
  const base = `Bist du dir sicher?`;
  const ancestors = collectAncestors(task, parentMap);
  const affectedAncestors = ancestors.filter((ancestor) =>
    mode === "archived"
      ? ancestor.state === "archived"
      : ancestor.state === "deleted",
  );

  const blockingAncestor = ancestors.find((ancestor) => {
    if (mode === "archived") return ancestor.state === "deleted";
    return ancestor.state === "archived";
  });
  if (blockingAncestor) {
    const stateLabel =
      blockingAncestor.state === "archived" ? "archiviert" : "gelöscht";
    return {
      canRestore: false,
      description: `Wiederherstellung nicht möglich — die Überaufgabe „${blockingAncestor.title}" ist ${stateLabel}.`,
      affectedAncestors,
    };
  }

  // If any active completed ancestor exists and this task is not completed,
  // restoring can force completion rollback up the chain.
  const completedAncestor = ancestors.find(
    (ancestor) => ancestor.state === "active_completed",
  );
  if (completedAncestor && !task.completedAt) {
    return {
      canRestore: true,
      description: base,
      warning: `Die Überaufgabe „${completedAncestor.title}" ist als erledigt markiert.`,
      affectedAncestors,
    };
  }

  return {
    canRestore: true,
    description: base,
    affectedAncestors,
  };
}

function ArchiveTaskNode({
  task,
  mode,
  isRoot,
  onRestore,
}: {
  task: TaskNode;
  mode: "archived" | "deleted";
  isRoot: boolean;
  onRestore: (task: TaskNode) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={clsx(
        "flex flex-col gap-4 dark:text-white",
        !isRoot ? "ml-4" : "mt-4 font-semibold",
      )}
    >
      <div
        role="button"
        className="flex justify-between items-start gap-2 sm:items-center py-2 pl-4 pr-2 rounded-lg border-l-4 border-gray-300 dark:border-gray-600 select-none hover:bg-gray-50 dark:hover:bg-zinc-800"
        onClick={() => {
          task.children.length > 0 && setIsExpanded((prev) => !prev);
        }}
      >
        <div className="shrink-0">
          <Subheading level={4} className="flex flex-gap-1 items-center">
            {task.title}
            {isExpanded ? (
              <ChevronUpIcon className="w-6 h-6" />
            ) : task.children.length > 0 ? (
              <ChevronDownIcon className="w-6 h-6" />
            ) : null}
          </Subheading>
          <SecondaryText>
            {(task.totalTimeSpent > 0 || task.estimate) && (
              <>
                {task.totalTimeSpent > 0
                  ? formatTime(task.totalTimeSpent, "sec", "HH:MM", true)
                  : "\u2014"}
                {task.estimate != null && (
                  <>
                    {" / "}
                    {formatTime(task.estimate, "min", "HH:MM", true)}
                  </>
                )}
              </>
            )}
          </SecondaryText>
        </div>

        <div
          className="flex justify-end items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <IconButton onClick={() => onRestore(task)}>
            {mode === "archived" ? (
              <ArchiveBoxXMarkIcon className="w-5 h-5" />
            ) : (
              <TrashXIcon />
            )}
          </IconButton>
        </div>
      </div>

      {isExpanded &&
        task.children.length > 0 &&
        task.children.map((child) => (
          <ArchiveTaskNode
            key={child.id}
            task={child}
            mode={mode}
            isRoot={false}
            onRestore={onRestore}
          />
        ))}
    </div>
  );
}

export default function ArchiveTaskList({
  tasks,
  mode,
  parentMap,
}: {
  tasks: TaskNode[];
  mode: "archived" | "deleted";
  parentMap: Record<string, TaskParentInfo>;
}) {
  const { showToast } = useToast();
  const [taskToRestore, setTaskToRestore] = useState<TaskNode | null>(null);
  const [loading, setLoading] = useState(false);

  const check = taskToRestore
    ? getRestoreCheck(taskToRestore, mode, parentMap)
    : null;

  async function handleRestore() {
    if (!taskToRestore || !check?.canRestore) return;
    setLoading(true);
    let result =
      mode === "archived"
        ? await unarchiveTaskAction({ taskId: taskToRestore.id })
        : await restoreDeletedTaskAction({ taskId: taskToRestore.id });
    if (!result.success) {
      showToast(
        <ErrorToast
          title="Fehler"
          description="Die Aufgabe konnte nicht wiederhergestellt werden."
        />,
      );
    } else {
      showToast(
        <SuccessToast
          title="Aufgabe wiederhergestellt"
          description={`Die Aufgabe „${taskToRestore.title}" wurde erfolgreich wiederhergestellt.`}
        />,
      );
    }
    setLoading(false);
    setTaskToRestore(null);
  }

  return (
    <>
      <div className="flex flex-col">
        {tasks.map((task) => (
          <ArchiveTaskNode
            key={task.id}
            task={task}
            mode={mode}
            isRoot={true}
            onRestore={setTaskToRestore}
          />
        ))}
      </div>

      <Alert open={!!taskToRestore} onClose={() => setTaskToRestore(null)}>
        <AlertTitle>
          {check?.canRestore
            ? check.affectedAncestors.length > 0
              ? `„${taskToRestore?.title}" inkl. Überaufgaben wiederherstellen?`
              : `„${taskToRestore?.title}" wiederherstellen?`
            : "Wiederherstellung nicht möglich"}
        </AlertTitle>
        <AlertDescription>
          {check?.description}
          {check?.canRestore && check && (
            <span className="mt-2 block">
              {getAffectedSummary(check.affectedAncestors)}
            </span>
          )}
          {check?.warning && (
            <span className="block mt-2 text-amber-600 dark:text-amber-400">
              {check.warning}
            </span>
          )}
        </AlertDescription>
        <AlertActions>
          <Button
            plain
            onClick={() => setTaskToRestore(null)}
            disabled={loading}
          >
            {check?.canRestore ? "Abbrechen" : "Schließen"}
          </Button>
          {check?.canRestore && (
            <Button onClick={handleRestore} disabled={loading}>
              Wiederherstellen
            </Button>
          )}
        </AlertActions>
      </Alert>
    </>
  );
}
