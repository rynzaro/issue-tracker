"use client";

import clsx from "clsx";
import { TaskNode } from "./taskManager";
import { useState } from "react";
import {
  ChevronDoubleUpIcon,
  ChevronDoubleDownIcon,
  PlusIcon,
  PlayPauseIcon,
} from "@heroicons/react/16/solid";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import TextInput from "@/components/textInput";
import PrimaryButton from "@/components/primaryButton";

function TagEntryComponent({
  node,
  setSelectedAddChildTask,
}: {
  node: TaskNode;
  setSelectedAddChildTask: React.Dispatch<
    React.SetStateAction<TaskNode | null>
  >;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <div className="ml-8 flex flex-col gap-4">
      <div className="border border-gray-300 rounded-lg text-left flex">
        <button
          type="button"
          disabled={node.children.size === 0}
          onClick={() => {
            setIsExpanded((prev) => !prev);
          }}
          className={clsx(
            "py-2 px-3 text-left w-full",
            node.children.size !== 0 &&
              "hover:bg-gray-100 hover:cursor-pointer  ",
          )}
        >
          {node.name}{" "}
          {node.children.size > 0 &&
            (isExpanded ? (
              <ChevronDoubleUpIcon className="inline-block w-4 h-4 " />
            ) : (
              <ChevronDoubleDownIcon className="inline-block w-4 h-4 " />
            ))}
        </button>
        <div className="flex gap-2 items-center mr-3">
          <button className="bg-indigo-600 text-white p-1 rounded hover:cursor-pointer">
            <PlayPauseIcon className="w-3 h-3" />
          </button>
          <button
            className="bg-indigo-600 text-white p-1 rounded hover:cursor-pointer"
            onClick={() => setSelectedAddChildTask(node)}
          >
            <PlusIcon className="w-3 h-3" />
          </button>
        </div>
      </div>

      {isExpanded && node.children.size > 0 && (
        <div className="flex flex-col gap-4">
          {Array.from(node.children).map((child) => (
            <TagEntryComponent
              key={child.fullPath}
              node={child}
              setSelectedAddChildTask={setSelectedAddChildTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TaskHierarchy({
  roots,
  createTag,
}: {
  roots: Set<TaskNode>;
  createTag: (name: string) => Promise<boolean>;
}) {
  const [selectedAddChildTask, setSelectedAddChildTask] =
    useState<TaskNode | null>(null);
  const [newChildName, setNewChildName] = useState("");
  return (
    <>
      <div className="-ml-8 flex flex-col gap-4 ">
        {Array.from(roots).map((root) => (
          <TagEntryComponent
            key={root.fullPath}
            node={root}
            setSelectedAddChildTask={setSelectedAddChildTask}
          />
        ))}
      </div>
      <Dialog
        open={!!selectedAddChildTask}
        onClose={() => setSelectedAddChildTask(null)}
        className="relative z-10"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
        />

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-sm sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95"
            >
              <div>
                <TextInput
                  value={newChildName}
                  onChange={(e) => setNewChildName(e.target.value)}
                  className="w-full"
                />
                <PrimaryButton
                  fullWidth
                  onClick={async () => {
                    const isSuccessful = await createTag(
                      selectedAddChildTask!.fullPath + "::T:" + newChildName,
                    );
                    if (isSuccessful) {
                      setSelectedAddChildTask(null);
                      setNewChildName("");
                    }
                  }}
                  className="mt-4"
                >
                  Hinzufügen
                </PrimaryButton>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
}
