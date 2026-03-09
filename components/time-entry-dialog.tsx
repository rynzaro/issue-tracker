"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogTitle,
} from "@/components/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
import { Button } from "@/components/button";
import DateTimeInput from "@/components/datetime-input";
import { PencilIcon, TrashIcon } from "@heroicons/react/16/solid";
import { formatTime } from "@/lib/util";
import {
  getTimeEntriesForTaskAction,
  createManualTimeEntryAction,
  updateTimeEntryAction,
  deleteTimeEntryAction,
} from "@/lib/actions/timeEntry.actions";
import {
  ErrorToast,
  SuccessToast,
  useToast,
} from "@/lib/notification/toastProvider";
import { CheckIcon, PlusIcon, XMarkIcon } from "@heroicons/react/16/solid";
import IconButton from "./iconButton";
import { set } from "zod";
import { useRouter } from "next/navigation";

type TimeEntry = {
  id: string;
  taskId: string;
  userId: string;
  startedAt: Date;
  stoppedAt: Date;
  duration: number;
  createdAt: Date;
};

/**
 * Dialog for viewing, creating, editing, and deleting time entries for a task.
 * Opened from the ℹ️ button on task rows.
 */
export default function TimeEntryDialog({
  task,
  onClose,
}: {
  task: { id: string; title: string } | null;
  onClose: () => void;
}) {
  const displayTask = useRef<{ id: string; title: string } | null>(null);
  if (task) displayTask.current = task;

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState<Date>(new Date());
  const [editEnd, setEditEnd] = useState<Date>(new Date());
  const [creatingNewBottom, setCreatingNewBottom] = useState(false);
  const [newStart, setNewStart] = useState<Date>(new Date());
  const [newEnd, setNewEnd] = useState<Date>(new Date());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [creatingNewTop, setCreatingNewTop] = useState(false);
  const router = useRouter();

  const { showToast } = useToast();

  function validateTimeRange(start: Date, end: Date): string | null {
    if (end <= start) return "Endzeit muss nach Startzeit liegen.";
    const now = Date.now() + 1000; // 1-second grace (matches server schema)
    if (start.getTime() > now)
      return "Startzeit darf nicht in der Zukunft liegen.";
    if (end.getTime() > now) return "Endzeit darf nicht in der Zukunft liegen.";
    return null;
  }

  const editError = editingId ? validateTimeRange(editStart, editEnd) : null;
  const createError =
    creatingNewBottom || creatingNewTop
      ? validateTimeRange(newStart, newEnd)
      : null;

  function getErrorMessage(result: {
    success: false;
    error: { code: string; message: string; details?: unknown };
  }): string {
    if (result.error.code === "VALIDATION_ERROR" && result.error.details) {
      // Zod flattened errors structure
      const details = result.error.details as {
        formErrors?: string[];
        fieldErrors?: Record<string, string[]>;
      };
      if (details.fieldErrors) {
        const firstError = Object.values(details.fieldErrors).flat()[0];
        return firstError || result.error.message;
      }
    }
    return result.error.message;
  }

  const fetchEntries = useCallback(async (taskId: string) => {
    setFetching(true);
    const result = await getTimeEntriesForTaskAction({ taskId });
    if (result.success) {
      setEntries(
        (result.data ?? []).map((e: TimeEntry) => ({
          ...e,
          startedAt: new Date(e.startedAt),
          stoppedAt: new Date(e.stoppedAt),
          createdAt: new Date(e.createdAt),
        })),
      );
    }
    setFetching(false);
  }, []);

  useEffect(() => {
    if (task) {
      fetchEntries(task.id);
      // Reset sub-states when opening for a new task
      setEditingId(null);
      setCreatingNewBottom(false);
      setCreatingNewTop(false);
      setDeleteConfirmId(null);
    }
  }, [task, fetchEntries]);

  // ─── Edit handlers ─────────────────────────────────────────────────────

  function startEditing(entry: TimeEntry) {
    setEditingId(entry.id);
    setEditStart(new Date(entry.startedAt));
    setEditEnd(new Date(entry.stoppedAt));
  }

  async function handleEditSave() {
    if (!editingId || !task) return;
    setLoading(true);
    const result = await updateTimeEntryAction({
      timeEntryId: editingId,
      startedAt: editStart,
      stoppedAt: editEnd,
    });
    if (result.success) {
      showToast(
        <SuccessToast
          title="Eintrag aktualisiert"
          description="Der Zeiteintrag wurde erfolgreich aktualisiert."
        />,
      );
      setEditingId(null);
      await fetchEntries(task.id);
    } else {
      showToast(
        <ErrorToast title="Fehler" description={getErrorMessage(result)} />,
      );
    }
    setLoading(false);
    router.refresh();
  }

  // ─── Delete handlers ───────────────────────────────────────────────────

  async function handleDelete(entryId: string) {
    if (!task) return;
    setLoading(true);
    const result = await deleteTimeEntryAction({ timeEntryId: entryId });
    if (result.success) {
      showToast(
        <SuccessToast
          title="Eintrag gelöscht"
          description="Der Zeiteintrag wurde erfolgreich gelöscht."
        />,
      );
      setDeleteConfirmId(null);
      await fetchEntries(task.id);
    } else {
      showToast(
        <ErrorToast title="Fehler" description={getErrorMessage(result)} />,
      );
    }
    setLoading(false);
    router.refresh();
  }

  // ─── Create handlers ──────────────────────────────────────────────────

  function openCreateFormBottom() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    setNewStart(oneHourAgo);
    setNewEnd(now);
    setCreatingNewTop(false);
    setCreatingNewBottom(true);
  }

  function openCreateFormTop() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    setNewStart(oneHourAgo);
    setNewEnd(now);
    setCreatingNewBottom(false);
    setCreatingNewTop(true);
  }

  async function handleCreate() {
    if (!task) return;
    setLoading(true);
    const result = await createManualTimeEntryAction({
      taskId: task.id,
      startedAt: newStart,
      stoppedAt: newEnd,
    });
    if (result.success) {
      showToast(
        <SuccessToast
          title="Eintrag erstellt"
          description="Der Zeiteintrag wurde erfolgreich erstellt."
        />,
      );
      setCreatingNewBottom(false);
      setCreatingNewTop(false);
      await fetchEntries(task.id);
    } else {
      showToast(
        <ErrorToast title="Fehler" description={getErrorMessage(result)} />,
      );
    }
    setLoading(false);
    router.refresh();
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <Dialog open={!!task} onClose={onClose} size="3xl">
      <div className="flex justify-between">
        <div className="flex gap-6 items-baseline">
          <DialogTitle>
            Zeiteinträge für &ldquo;{displayTask.current?.title}&rdquo;
          </DialogTitle>
          <Button responsive={false} onClick={openCreateFormTop}>
            Neuer Eintrag
          </Button>
        </div>
        <IconButton borderless onClick={onClose}>
          <XMarkIcon className="dark:text-white h-6 w-6 -translate-y-5 translate-x-3" />
        </IconButton>
      </div>
      {creatingNewTop && (
        <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
            Neuen Eintrag erstellen
          </p>
          <div className="flex items-center justify-between ">
            <div className="flex flex-col gap-2">
              <DateTimeInput
                value={newStart}
                onChange={setNewStart}
                label="Start:"
              />
              <DateTimeInput
                value={newEnd}
                onChange={setNewEnd}
                label="Ende:"
              />
            </div>

            <div className="flex gap-2 mt-3">
              <IconButton
                onClick={handleCreate}
                disabled={loading || !!createError}
              >
                <CheckIcon className="dark:text-white h-5 w-5" />
              </IconButton>
              <IconButton onClick={() => setCreatingNewTop(false)}>
                <XMarkIcon className="dark:text-white h-5 w-5" />
              </IconButton>
            </div>
          </div>
          {createError && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
              {createError}
            </p>
          )}
        </div>
      )}
      <DialogBody>
        {fetching ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 py-4">
            Lade Zeiteinträge…
          </p>
        ) : entries.length === 0 && !creatingNewBottom && !creatingNewTop ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 py-4">
            Keine Zeiteinträge vorhanden.
          </p>
        ) : (
          entries.length > 0 && (
            <Table dense>
              <TableHead>
                <TableRow>
                  <TableHeader>Datum</TableHeader>
                  <TableHeader>Start</TableHeader>
                  <TableHeader>Dauer</TableHeader>
                  <TableHeader className="text-right">Aktionen</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry) =>
                  editingId === entry.id ? (
                    <TableRow key={entry.id}>
                      <TableCell colSpan={5}>
                        <div className="flex flex-wrap items-center  justify-between  py-1">
                          <div className="flex flex-col gap-2">
                            <DateTimeInput
                              value={editStart}
                              onChange={setEditStart}
                              label="Start:"
                            />
                            <DateTimeInput
                              value={editEnd}
                              onChange={setEditEnd}
                              label="Ende:"
                            />
                          </div>

                          <div className="flex flex-col gap-1 ml-auto">
                            {editError && (
                              <p className="text-xs text-red-600 dark:text-red-400">
                                {editError}
                              </p>
                            )}
                            <div className="flex gap-2 dark:text-white font-bold">
                              <IconButton
                                onClick={handleEditSave}
                                disabled={loading || !!editError}
                              >
                                <CheckIcon className="dark:text-white h-6 w-6" />
                              </IconButton>
                              <IconButton onClick={() => setEditingId(null)}>
                                <XMarkIcon className="dark:text-white h-5 w-5" />
                              </IconButton>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : deleteConfirmId === entry.id ? (
                    <TableRow key={entry.id}>
                      <TableCell colSpan={5}>
                        <div className="flex items-center justify-between py-1">
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">
                            Eintrag wirklich löschen?
                          </span>
                          <div className="flex gap-2 items-center">
                            <Button
                              color="red"
                              onClick={() => handleDelete(entry.id)}
                              disabled={loading}
                              responsive={false}
                            >
                              Löschen
                            </Button>
                            <IconButton
                              onClick={() => setDeleteConfirmId(null)}
                              size="sm"
                            >
                              <XMarkIcon className="dark:text-white h-4 w-4" />
                            </IconButton>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={entry.id}>
                      <TableCell>{formatDateDE(entry.startedAt)}</TableCell>
                      <TableCell>{formatTimeHHMM(entry.startedAt)}</TableCell>
                      <TableCell>
                        {formatTime(entry.duration, "sec", "HH:MM:SS", true)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => startEditing(entry)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                            aria-label="Bearbeiten"
                          >
                            <PencilIcon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(entry.id)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            aria-label="Löschen"
                          >
                            <TrashIcon className="w-4 h-4 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          )
        )}

        {/* Create new entry */}
        {creatingNewBottom && (
          <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              Neuen Eintrag erstellen
            </p>
            <div className="flex flex-col gap-2">
              <DateTimeInput
                value={editStart}
                onChange={setEditStart}
                label="Start:"
              />
              <DateTimeInput
                value={editEnd}
                onChange={setEditEnd}
                label="Ende:"
              />
            </div>
            {createError && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                {createError}
              </p>
            )}
            <div className="flex gap-2 mt-3">
              <Button
                onClick={handleCreate}
                disabled={loading || !!createError}
              >
                Erstellen
              </Button>
              <Button plain onClick={() => setCreatingNewBottom(false)}>
                Abbrechen
              </Button>
            </div>
          </div>
        )}
      </DialogBody>
      <DialogActions>
        <Button outline onClick={openCreateFormBottom}>
          <PlusIcon className="dark:text-white" />
          Manuellen Eintrag erstellen
        </Button>
        <Button plain onClick={onClose}>
          Schließen
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Formatting helpers ──────────────────────────────────────────────────────

/** Format a Date as DD.MM.YYYY (German) */
function formatDateDE(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

/** Format a Date as HH:MM */
function formatTimeHHMM(d: Date): string {
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}
