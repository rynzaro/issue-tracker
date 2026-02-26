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
} from "@heroicons/react/16/solid";
import clsx from "clsx";
import { Dispatch, SetStateAction, useState } from "react";
import TaskRowButton from "./taskRowButton";
import { Subheading } from "@/components/heading";
import { SecondaryText } from "@/components/text";
import { formatTime } from "@/lib/util";
import { useElapsedTimer } from "@/lib/hooks";
import {
  startTimeEntryAction,
  stopTimeEntryAction,
} from "@/lib/actions/timeEntry.actions";

function formatElapsed(elapsed: number, taskStatus: string): string | null {
  if (elapsed <= 0 && taskStatus !== "IN_PROGRESS") return null;
  return elapsed < 600
    ? formatTime(elapsed, "sec", "MM:SS", true)
    : formatTime(elapsed, "sec", "HH:MM", true);
}

export default function Tasks({
  projectId,
  task,
  isRoot,
  setNewTaskParent,
  setTaskToEdit,
  setTaskToDelete,
}: {
  projectId: string;
  task: TaskNode;
  isRoot: boolean;
  setNewTaskParent: Dispatch<SetStateAction<TaskNode | null>>;
  setTaskToEdit: (task: TaskNode) => void;
  setTaskToDelete: Dispatch<SetStateAction<TaskNode | null>>;
}) {
  const [isExpanded, setIsExpanded] = useState(task.hasActiveDescendant);
  const elapsed = useElapsedTimer(task.activeTimerStartedAt);
  const elapsedDisplay =
    task.status === "IN_PROGRESS" ? formatElapsed(elapsed, task.status) : null;

  return (
    <div
      className={clsx(
        "flex flex-col gap-4 dark:text-white",
        !isRoot ? "ml-4  " : "mt-4  font-semibold",
      )}
    >
      <div
        role="button"
        className={clsx(
          "flex justify-between items-start sm:flex-row flex-col gap-2 sm:items-center py-2 pl-4 pr-2 rounded-lg border-l-4 border-gray-300 dark:border-zinc-600",
          (task.status === "DONE" ||
            (task.status === "OPEN" && !task.hasActiveDescendant)) &&
            "hover:bg-gray-50 dark:hover:bg-zinc-800",
          task.status === "IN_PROGRESS" &&
            "bg-yellow-100 dark:bg-yellow-900/50 border-yellow-500 hover:bg-yellow-100/60 dark:hover:bg-yellow-900/30",
          task.hasActiveDescendant &&
            "bg-blue-100 dark:bg-blue-900/50 border-blue-500 hover:bg-blue-100/75 dark:hover:bg-blue-900/30",
        )}
        onClick={() => {
          task.children &&
            task.children.length > 0 &&
            setIsExpanded((prev) => !prev);
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
          className="flex justify-end gap-2 items-center"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {task.status === "IN_PROGRESS" ? (
            <>
              {/* ← SWAP TIMER VARIANT HERE — see options A/B/C/D below */}
              <TimerDisplay value={elapsedDisplay} />
              <TaskRowButton
                onClick={() => stopTimeEntryAction()}
                invertedColors
              >
                <StopIcon className="w-6 h-6" />
              </TaskRowButton>
            </>
          ) : (
            <TaskRowButton
              onClick={() => startTimeEntryAction({ taskId: task.id })}
            >
              <PlayIcon className="w-6 h-6" />
            </TaskRowButton>
          )}
          <TaskRowButton
            onClick={() => {
              setNewTaskParent(task);
            }}
          >
            <PlusIcon className="w-6 h-6" />
          </TaskRowButton>
          <TaskRowButton onClick={() => setTaskToEdit(task)}>
            <PencilIcon className="w-5 h-5" />
          </TaskRowButton>
          <TaskRowButton>
            <InformationCircleIcon className="w-5 h-5" />
          </TaskRowButton>
          <TaskRowButton
            disabled={task.hasActiveDescendant || task.status === "IN_PROGRESS"}
          >
            <CheckIcon className="w-6 h-6" />
          </TaskRowButton>
          <TaskRowButton
            borderless
            disabled={task.hasActiveDescendant || task.status === "IN_PROGRESS"}
            onClick={() => setTaskToDelete(task)}
          >
            <TrashIcon className="w-5 h-5" />
          </TaskRowButton>
        </div>
      </div>
      {isExpanded &&
        task.children &&
        task.children.length > 0 &&
        task.children.map((child) => (
          <Tasks
            key={child.id}
            projectId={projectId}
            task={child}
            isRoot={false}
            setNewTaskParent={setNewTaskParent}
            setTaskToEdit={setTaskToEdit}
            setTaskToDelete={setTaskToDelete}
          />
        ))}
    </div>
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
