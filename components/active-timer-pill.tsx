"use client";

import { useState, useEffect } from "react";
import { useElapsedTimer } from "@/lib/hooks";
import { formatTime } from "@/lib/util";
import { StopIcon } from "@heroicons/react/16/solid";
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
 * Mobile floating pill for the active timer.
 * Fixed bottom-right, visible only on screens < lg.
 * Collapsed: pulsing dot + MM:SS. Tap to expand upward.
 * Expanded: task name, elapsed, start time editing, stop button.
 */
export default function ActiveTimerPill({
  timer,
}: {
  timer: { taskId: string; taskTitle: string; startedAt: Date };
}) {
  const [expanded, setExpanded] = useState(false);
  const [newStart, setNewStart] = useState<Date>(timer.startedAt);
  const [loading, setLoading] = useState(false);
  const elapsed = useElapsedTimer(timer.startedAt);
  const { showToast } = useToast();

  // Reset newStart when opening or when the timer changes (e.g. after a successful save)
  useEffect(() => {
    if (expanded) setNewStart(timer.startedAt);
  }, [expanded, timer.startedAt]);

  const isFutureStart = newStart.getTime() > Date.now() + 1000;

  const shortDisplay =
    elapsed < 3600
      ? formatTime(elapsed, "sec", "MM:SS", true)
      : formatTime(elapsed, "sec", "HH:MM", true);

  const fullDisplay =
    elapsed < 3600
      ? formatTime(elapsed, "sec", "MM:SS", true)
      : formatTime(elapsed, "sec", "HH:MM:SS", true);

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
      setExpanded(false);
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

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed bottom-4 right-4 z-50 lg:hidden flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-white/10"
      >
        <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse-dot shrink-0" />
        <span className="text-sm font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
          {shortDisplay}
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 left-4 z-50 lg:hidden  rounded-xl bg-white p-4 shadow-xl ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-white/10">
      <div className="flex flex-col gap-3">
        {/* Task name + time (adaptive: same line when fits, wraps when long) + close */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
            <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-40">
              {timer.taskTitle}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse-dot shrink-0 relative -top-px" />
              <span className="text-sm font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                {fullDisplay}
              </span>
            </div>
          </div>
          <button
            onClick={() => setExpanded(false)}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 shrink-0 mt-0.5"
            aria-label="Minimieren"
          >
            ✕
          </button>
        </div>

        {/* Start time editing */}
        <DateTimeInput
          value={newStart}
          onChange={setNewStart}
          label="Start:"
          className="flex-wrap"
        />
        {isFutureStart && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Startzeit darf nicht in der Zukunft liegen.
          </p>
        )}

        <div className="flex items-center justify-between gap-2">
          <button
            onClick={handleStop}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-800 dark:hover:bg-gray-200 transition-colors shrink-0"
            aria-label="Timer stoppen"
          >
            <StopIcon className="w-4 h-4" />
          </button>
          <Button
            onClick={handleSave}
            disabled={loading || isFutureStart}
            className="flex-1"
          >
            Speichern
          </Button>
        </div>
      </div>
    </div>
  );
}
