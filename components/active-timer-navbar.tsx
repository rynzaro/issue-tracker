"use client";

import { useElapsedTimer } from "@/lib/hooks";
import { formatTime } from "@/lib/util";
import { PencilIcon, StopIcon } from "@heroicons/react/16/solid";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/button";
import DateTimeInput from "@/components/datetime-input";
import {
  stopActiveTimerAction,
  changeActiveTimerStartAction,
} from "@/lib/actions/activeTask.actions";
import {
  ErrorToast,
  SuccessToast,
  useToast,
} from "@/lib/notification/toastProvider";

/**
 * Desktop active timer display — rendered inside the NavbarSpacer area.
 * Shows pulsing dot, task name, elapsed time, edit popover, stop button.
 * Hidden on mobile via parent CSS (max-lg:hidden).
 */
export default function ActiveTimerNavbar({
  timer,
}: {
  timer: { taskId: string; taskTitle: string; startedAt: Date };
}) {
  const elapsed = useElapsedTimer(timer.startedAt);
  const { showToast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [newStart, setNewStart] = useState<Date>(new Date(timer.startedAt));
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const elapsedDisplay =
    elapsed < 3600
      ? formatTime(elapsed, "sec", "MM:SS", true)
      : formatTime(elapsed, "sec", "HH:MM:SS", true);

  // Close on click outside
  useEffect(() => {
    if (!editOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setEditOpen(false);
        setNewStart(new Date(timer.startedAt));
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [editOpen, timer.startedAt]);

  async function handleStop() {
    const result = await stopActiveTimerAction();
    if (!result.success) {
      showToast(
        <ErrorToast
          title="Fehler"
          description="Timer konnte nicht gestoppt werden."
        />,
      );
    }
  }

  const isFutureStart = newStart.getTime() > Date.now() + 1000;

  async function handleSave() {
    setLoading(true);
    const result = await changeActiveTimerStartAction({ newStart });
    if (result.success) {
      showToast(
        <SuccessToast
          title="Startzeit aktualisiert"
          description="Die Startzeit wurde erfolgreich geändert."
        />,
      );
      setEditOpen(false);
    } else {
      showToast(
        <ErrorToast
          title="Fehler"
          description="Startzeit konnte nicht geändert werden."
        />,
      );
    }
    setLoading(false);
  }

  return (
    <div className="relative flex items-center gap-3 max-lg:hidden">
      <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse-dot shrink-0" />
      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-48">
        {timer.taskTitle}
      </span>
      <span className="text-sm font-mono tabular-nums text-zinc-600 dark:text-zinc-400 shrink-0">
        {elapsedDisplay}
      </span>
      <button
        ref={triggerRef}
        onClick={() => setEditOpen((v) => !v)}
        className="flex items-center justify-center w-8 h-8 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        aria-label="Startzeit bearbeiten"
      >
        <PencilIcon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
      </button>
      <button
        onClick={handleStop}
        className="flex items-center justify-center w-8 h-8 rounded bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-800 dark:hover:bg-gray-200 transition-colors"
        aria-label="Timer stoppen"
      >
        <StopIcon className="w-4 h-4" />
      </button>

      {editOpen && (
        <div
          ref={panelRef}
          data-state={editOpen ? "open" : "closed"}
          className="absolute right-0 top-full mt-2 z-50 rounded-lg bg-white p-3 shadow-lg ring-2 ring-zinc-950/5 transition-opacity duration-200 data-[state=closed]:pointer-events-none data-[state=closed]:opacity-0 dark:bg-zinc-800 dark:ring-white/30"
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 ">
              <DateTimeInput
                value={newStart}
                onChange={setNewStart}
                label="Startzeit:"
              />
              <Button
                onClick={handleSave}
                disabled={loading || isFutureStart}
                className="px-2.5! py-1! text-xs!"
              >
                Speichern
              </Button>
              <Button
                plain
                onClick={() => {
                  setEditOpen(false);
                  setNewStart(new Date(timer.startedAt));
                }}
                className="px-2! py-1! text-xs!"
              >
                Abbrechen
              </Button>
            </div>
            {isFutureStart && (
              <p className="text-xs text-red-600 dark:text-red-400">
                Startzeit darf nicht in der Zukunft liegen.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
