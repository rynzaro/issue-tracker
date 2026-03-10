"use client";

import { SerializableTaskNode, TaskNode } from "@/lib/schema/task";
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
};

function getRestoreCheck(
  task: TaskNode,
  mode: "archived" | "deleted",
  parentMap: Record<string, TaskParentInfo>,
): RestoreCheck {
  const base = `Bist du dir sicher, dass du Aufgabe „${task.title}" wiederherstellen möchtest?`;

  if (!task.parentId) {
    return { canRestore: true, description: base };
  }

  const parent = parentMap[task.parentId];
  if (!parent) {
    return { canRestore: true, description: base };
  }

  const parentLabel = `„${parent.title}"`;

  // Parent is in the same tree (both archived or both deleted)
  if (
    (mode === "archived" && parent.state === "archived") ||
    (mode === "deleted" && parent.state === "deleted")
  ) {
    const stateLabel = mode === "archived" ? "archiviert" : "gelöscht";
    return {
      canRestore: false,
      description: `Die Elternaufgabe ${parentLabel} ist ebenfalls ${stateLabel}. Stelle zuerst die Elternaufgabe wieder her.`,
    };
  }

  // Parent is in the OTHER tree
  if (parent.state === "archived" || parent.state === "deleted") {
    const stateLabel = parent.state === "archived" ? "archiviert" : "gelöscht";
    return {
      canRestore: false,
      description: `Wiederherstellung nicht möglich — die Elternaufgabe ${parentLabel} ist ${stateLabel}.`,
    };
  }

  // Parent is active and completed, but child is NOT completed
  if (parent.state === "active_completed" && !task.completedAt) {
    return {
      canRestore: true,
      description: `${base} Dies ist eine Unteraufgabe von ${parentLabel}.`,
      warning: `Die Elternaufgabe ${parentLabel} ist als erledigt markiert — die Erledigung der Elternaufgabe wird dadurch aufgehoben.`,
    };
  }

  // Parent is active (possibly completed, but child also completed — no issue)
  return {
    canRestore: true,
    description: `${base} Dies ist eine Unteraufgabe von ${parentLabel}.`,
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
            ? `Aufgabe „${taskToRestore?.title}" wiederherstellen?`
            : "Wiederherstellung nicht möglich"}
        </AlertTitle>
        <AlertDescription>
          {check?.description}
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
