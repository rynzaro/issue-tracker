"use client";

import { TaskNode } from "@/lib/schema/task";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  StopIcon,
  TrashIcon,
  Bars3Icon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/16/solid";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Dispatch, SetStateAction, useState } from "react";
import IconButton from "../../../../components/iconButton";
import { Subheading } from "@/components/heading";
import { SecondaryText } from "@/components/text";
import { formatTime, getActiveDescendantStartedAt } from "@/lib/util";
import { useElapsedTimer } from "@/lib/hooks";
import {
  startActiveTimerAction,
  stopActiveTimerAction,
} from "@/lib/actions/activeTask.actions";
import {
  completeTaskAction,
  uncompleteTaskAction,
} from "@/lib/actions/task.actions";
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownMenu,
} from "@/components/dropdown";
import { ArchiveBoxIcon } from "@heroicons/react/16/solid";
import { Tooltip } from "@/components/tooltip";
import {
  ErrorToast,
  SuccessToast,
  useToast,
} from "@/lib/notification/toastProvider";

function formatElapsed(elapsed: number, taskStatus: string): string | null {
  if (elapsed <= 0 && taskStatus !== "IN_PROGRESS") return null;
  return elapsed < 3600
    ? formatTime(elapsed, "sec", "MM:SS", true)
    : formatTime(elapsed, "sec", "HH:MM", true);
}

export default function Tasks({
  projectId,
  task,
  isRoot = false,
  setNewTaskParent,
  setTaskToEdit,
  setTaskToDelete,
  setTaskToArchive,
  setTaskForTimeEntries,
  inCompletedSection,
}: {
  projectId: string;
  task: TaskNode;
  isRoot?: boolean;
  setNewTaskParent: Dispatch<SetStateAction<TaskNode | null>>;
  setTaskToEdit: (task: TaskNode) => void;
  setTaskToDelete: Dispatch<SetStateAction<TaskNode | null>>;
  setTaskToArchive: Dispatch<SetStateAction<TaskNode | null>>;
  setTaskForTimeEntries: Dispatch<
    SetStateAction<{ id: string; title: string } | null>
  >;
  inCompletedSection: boolean;
}) {
  const isCompleted = task.status === "DONE";
  const isTimerActive =
    task.hasActiveDescendant || task.status === "IN_PROGRESS";
  const [isExpanded, setIsExpanded] = useState(task.hasActiveDescendant);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const timerStartedAt =
    task.status === "IN_PROGRESS"
      ? task.activeTimerStartedAt
      : task.hasActiveDescendant
        ? getActiveDescendantStartedAt(task)
        : null;

  const elapsed = useElapsedTimer(timerStartedAt);
  const displayTotal = task.totalTimeSpent + elapsed;

  async function handleCompleteTask(completeTaskParams: { taskId: string }) {
    setLoading(true);
    const result = await completeTaskAction(completeTaskParams);
    if (result.success) {
      showToast(
        <SuccessToast
          title="Aufgabe als erledigt markiert"
          description="Die Aufgabe wurde erfolgreich als erledigt markiert."
        />,
      );
    } else {
      showToast(
        <ErrorToast
          title="Fehler beim bearbeiten der Aufgabe"
          description="Bitte versuche es erneut."
        />,
      );
    }
    setLoading(false);
  }

  async function handleUncompleteTask(uncompleteTaskParams: {
    taskId: string;
  }) {
    setLoading(true);
    const result = await uncompleteTaskAction(uncompleteTaskParams);
    if (result.success) {
      showToast(
        <SuccessToast
          title="Aufgabe als nicht erledigt markiert"
          description="Die Aufgabe wurde erfolgreich als nicht erledigt markiert."
        />,
      );
    } else {
      showToast(
        <ErrorToast
          title="Fehler beim bearbeiten der Aufgabe"
          description="Bitte versuche es erneut."
        />,
      );
    }
    setLoading(false);
  }

  return (
    <div
      className={clsx(
        "flex flex-col gap-4 dark:text-white",
        !isRoot ? "ml-4  " : "mt-4  font-semibold",
      )}
    >
      <div className="flex sm:flex-col"></div>
      <div
        role="button"
        className={clsx(
          "flex justify-between items-start gap-2 sm:items-center py-2 pl-4 pr-2 rounded-lg border-l-4 select-none",
          (task.status === "DONE" ||
            (task.status === "OPEN" && !task.hasActiveDescendant)) &&
            "hover:bg-gray-50 dark:hover:bg-zinc-800",
          task.status === "IN_PROGRESS" || task.hasActiveDescendant
            ? "border-gray-600 dark:border-gray-300"
            : "border-gray-300 dark:border-gray-600",
        )}
        onClick={() => {
          task.children &&
            task.children.length > 0 &&
            setIsExpanded((prev) => !prev);
        }}
      >
        <div className={clsx("shrink-0", isCompleted && "opacity-50")}>
          <Subheading level={4} className="flex flex-gap-1 items-center">
            {(task.status === "IN_PROGRESS" || task.hasActiveDescendant) && (
              <span className="inline-block w-2 h-2 rounded-full bg-zinc-700 dark:bg-zinc-300 mr-2 animate-pulse-dot" />
            )}
            {isCompleted ? (
              <span className="line-through">{task.title}</span>
            ) : (
              task.title
            )}
            {isExpanded ? (
              <ChevronUpIcon className="w-6 h-6" />
            ) : task.children.length > 0 ? (
              <ChevronDownIcon className="w-6 h-6" />
            ) : null}
            {task.hasEstimateOverflow && (
              <Tooltip
                maxWidth="md"
                content="Die geschätzte Zeit für diese Aufgabe ist geringer als die Summe aller Schätzungen der Unteraufgaben."
              >
                <ExclamationTriangleIcon className="text-red-500 dark:text-red-400 h-6 w-6 ml-4" />
              </Tooltip>
            )}
          </Subheading>
          <SecondaryText>
            {(displayTotal > 0 || task.estimate) && (
              <>
                {displayTotal > 0
                  ? formatTime(displayTotal, "sec", "HH:MM", true)
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
          className="flex justify-end gap-2 items-center"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {isCompleted ? (
            <IconButton
              onClick={() => uncompleteTaskAction({ taskId: task.id })}
            >
              <ArrowUturnLeftIcon className="w-6 h-6" />
            </IconButton>
          ) : (
            <>
              {task.status === "IN_PROGRESS" ? (
                <>
                  <TimerDisplay value={formatElapsed(elapsed, task.status)} />
                  <IconButton
                    onClick={() => stopActiveTimerAction()}
                    invertedColors
                  >
                    <StopIcon className="w-6 h-6" />
                  </IconButton>
                </>
              ) : (
                <IconButton
                  onClick={() => startActiveTimerAction({ taskId: task.id })}
                >
                  <PlayIcon className="w-6 h-6" />
                </IconButton>
              )}
              <div className="hidden sm:flex gap-2 ">
                <IconButton
                  onClick={() => {
                    setNewTaskParent(task);
                  }}
                >
                  <PlusIcon className="w-6 h-6" />
                </IconButton>
                <IconButton onClick={() => setTaskToEdit(task)}>
                  <PencilIcon className="w-5 h-5" />
                </IconButton>
                <IconButton
                  onClick={() =>
                    setTaskForTimeEntries({ id: task.id, title: task.title })
                  }
                >
                  <InformationCircleIcon className="w-5 h-5" />
                </IconButton>
                <IconButton
                  disabled={isTimerActive}
                  onClick={() =>
                    isCompleted
                      ? handleUncompleteTask({ taskId: task.id })
                      : handleCompleteTask({ taskId: task.id })
                  }
                >
                  {isCompleted ? (
                    <ArrowUturnLeftIcon className="w-6 h-6" />
                  ) : (
                    <CheckIcon className="w-6 h-6" />
                  )}
                </IconButton>
                <IconButton
                  disabled={isTimerActive}
                  onClick={() => setTaskToArchive(task)}
                >
                  <ArchiveBoxIcon className="w-5 h-5" />
                </IconButton>
                <IconButton
                  borderless
                  disabled={isTimerActive}
                  onClick={() => setTaskToDelete(task)}
                >
                  <TrashIcon className="w-5 h-5" />
                </IconButton>
              </div>
              <div className="sm:hidden">
                <Dropdown>
                  <DropdownButton plain>
                    <Bars3Icon className="w-5 h-5 dark:text-white" />
                  </DropdownButton>
                  <DropdownMenu>
                    <DropdownItem
                      onClick={() => {
                        setNewTaskParent(task);
                      }}
                    >
                      <PlusIcon className="w-6 h-6" />
                      Neue Unteraufgabe
                    </DropdownItem>
                    <DropdownItem onClick={() => setTaskToEdit(task)}>
                      <PencilIcon className="w-5 h-5" />
                      Aufgabe bearbeiten
                    </DropdownItem>
                    <DropdownItem
                      onClick={() =>
                        setTaskForTimeEntries({
                          id: task.id,
                          title: task.title,
                        })
                      }
                    >
                      <InformationCircleIcon className="w-5 h-5" />
                      Details
                    </DropdownItem>
                    <DropdownItem
                      disabled={isTimerActive}
                      onClick={() =>
                        isCompleted
                          ? uncompleteTaskAction({ taskId: task.id })
                          : completeTaskAction({ taskId: task.id })
                      }
                    >
                      <CheckIcon className="w-6 h-6" />
                      {isCompleted
                        ? "Erledigung aufheben"
                        : "Als erledigt markieren"}
                    </DropdownItem>
                    <DropdownItem
                      disabled={isTimerActive}
                      onClick={() => setTaskToArchive(task)}
                    >
                      <ArchiveBoxIcon className="w-5 h-5" />
                      Archivieren
                    </DropdownItem>
                    <DropdownDivider />
                    <DropdownItem
                      disabled={isTimerActive}
                      onClick={() => setTaskToDelete(task)}
                    >
                      <span className="text-red-500 dark:text-red-400">
                        <TrashIcon className="w-5 h-5" />
                      </span>
                      <span className="text-red-500 dark:text-red-400">
                        Löschen
                      </span>
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>
            </>
          )}
        </div>
      </div>

      {isExpanded && task.children.length > 0 && task.children && (
        <ExpandedChildren
          task={task}
          projectId={projectId}
          setNewTaskParent={setNewTaskParent}
          setTaskToEdit={setTaskToEdit}
          setTaskToDelete={setTaskToDelete}
          setTaskToArchive={setTaskToArchive}
          setTaskForTimeEntries={setTaskForTimeEntries}
          inCompletedSection={inCompletedSection}
        />
      )}
    </div>
  );
}

function ExpandedChildren({
  task,
  projectId,
  setNewTaskParent,
  setTaskToEdit,
  setTaskToDelete,
  setTaskToArchive,
  setTaskForTimeEntries,
  inCompletedSection,
}: {
  task: TaskNode;
  projectId: string;
  setNewTaskParent: Dispatch<SetStateAction<TaskNode | null>>;
  setTaskToEdit: (task: TaskNode) => void;
  setTaskToDelete: Dispatch<SetStateAction<TaskNode | null>>;
  setTaskToArchive: Dispatch<SetStateAction<TaskNode | null>>;
  setTaskForTimeEntries: Dispatch<
    SetStateAction<{ id: string; title: string } | null>
  >;
  inCompletedSection: boolean;
}) {
  const [showCompleted, setShowCompleted] = useState(false);

  if (inCompletedSection) {
    return (
      <>
        {task.children.map((child) => (
          <Tasks
            key={task.id}
            projectId={projectId}
            task={child}
            isRoot={false}
            setNewTaskParent={setNewTaskParent}
            setTaskToEdit={setTaskToEdit}
            setTaskToDelete={setTaskToDelete}
            setTaskToArchive={setTaskToArchive}
            setTaskForTimeEntries={setTaskForTimeEntries}
            inCompletedSection={true}
          />
        ))}
      </>
    );
  }

  return (
    <>
      {task.children
        .filter((c) => c.status !== "DONE")
        .map((child) => (
          <Tasks
            key={child.id}
            projectId={projectId}
            task={child}
            isRoot={false}
            setNewTaskParent={setNewTaskParent}
            setTaskToEdit={setTaskToEdit}
            setTaskToDelete={setTaskToDelete}
            setTaskToArchive={setTaskToArchive}
            setTaskForTimeEntries={setTaskForTimeEntries}
            inCompletedSection={false}
          />
        ))}
      {task.children.filter((c) => c.status === "DONE").length > 0 && (
        <CompletedSection
          count={task.children.filter((c) => c.status === "DONE").length}
          open={showCompleted}
          onToggle={() => setShowCompleted((p) => !p)}
        >
          {task.children
            .filter((c) => c.status === "DONE")
            .map((child) => (
              <Tasks
                key={child.id}
                projectId={projectId}
                task={child}
                isRoot={false}
                setNewTaskParent={setNewTaskParent}
                setTaskToEdit={setTaskToEdit}
                setTaskToDelete={setTaskToDelete}
                setTaskToArchive={setTaskToArchive}
                setTaskForTimeEntries={setTaskForTimeEntries}
                inCompletedSection={true}
              />
            ))}
        </CompletedSection>
      )}
    </>
  );
}

function TimerDisplay({ value }: { value: string | null }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center rounded-md border border-gray-300 px-1.5 py-0.5 text-sm font-mono tabular-nums text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
      {value}
    </span>
  );
}

export function CompletedSection({
  count,
  open,
  onToggle,
  children,
}: {
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 select-none"
      >
        {open ? (
          <ChevronUpIcon className="w-4 h-4" />
        ) : (
          <ChevronDownIcon className="w-4 h-4" />
        )}
        Abgeschlossen ({count})
      </button>
      {open && children}
    </div>
  );
}
