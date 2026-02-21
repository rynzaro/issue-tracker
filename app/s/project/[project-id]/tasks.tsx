"use client";

import { Button } from "@/components/button";
import Card from "@/components/card";
import { Input } from "@/components/input";
import { createTaskAction } from "@/lib/actions/task.actions";
import { CreateTaskParams, TaskNode } from "@/lib/schema/task";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PencilIcon,
  PlayPauseIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/16/solid";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { Dispatch, SetStateAction, useState } from "react";
import TaskRowButton from "./taskRowButton";
import { Subheading } from "@/components/heading";
import { SecondaryText } from "@/components/text";

export default function Tasks({
  projectId,
  task,
  isRoot,
  setNewTaskParent,
  setTaskToEdit,
}: {
  projectId: string;
  task: TaskNode;
  isRoot: boolean;
  setNewTaskParent: Dispatch<SetStateAction<TaskNode | null>>;
  setTaskToEdit: (task: TaskNode) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={clsx(
        "flex flex-col gap-4 dark:text-white",
        !isRoot ? "ml-4  " : "mt-4  font-semibold",
      )}
    >
      <div
        role="button"
        className="flex justify-between gap-2 items-center py-2 pl-4 pr-2 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg border-l-4 border-gray-300 dark:border-zinc-600"
        onClick={() => {
          task.children &&
            task.children.length > 0 &&
            setIsExpanded((prev) => !prev);
        }}
      >
        <div className="flex gap-2 items-baseline">
          <Subheading level={4} className="flex flex-gap-1 items-center">
            {task.title}
            {isExpanded ? (
              <ChevronUpIcon className="w-6 h-6" />
            ) : task.children.length > 0 ? (
              <ChevronDownIcon className="w-6 h-6" />
            ) : null}
          </Subheading>
          {task.estimate && (
            <SecondaryText>Schätzung: {task.estimate} Minuten</SecondaryText>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <TaskRowButton>
            <PlayPauseIcon className="w-6 h-6" />
          </TaskRowButton>
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
            <CheckIcon className="w-6 h-6" />
          </TaskRowButton>
          <TaskRowButton>
            <InformationCircleIcon className="w-5 h-5" />
          </TaskRowButton>
          <TaskRowButton borderless>
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
          />
        ))}
    </div>
  );
}
