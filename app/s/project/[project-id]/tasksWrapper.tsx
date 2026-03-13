"use client";

import { TaskNode } from "@/lib/schema/task";
import Tasks from "./tasks";
import TimeEntryDialog from "@/components/time-entry-dialog";
import { useState } from "react";
import { usePersistentValue, useTaskForm } from "@/lib/hooks";
import { Button } from "@/components/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "@/components/dialog";
import {
  Alert,
  AlertActions,
  AlertDescription,
  AlertTitle,
} from "@/components/alert";
import { ErrorMessage, Field, FieldGroup, Label } from "@/components/fieldset";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { handleInput } from "@/lib/formUtils";
import {
  archiveTaskAction,
  deleteTaskAction,
} from "@/lib/actions/task.actions";
import {
  ErrorToast,
  SuccessToast,
  useToast,
} from "@/lib/notification/toastProvider";
import TaskDialog from "./taskDialog";

export default function TasksWrapper({
  projectId,
  tasks,
  inCompletedSection,
}: {
  projectId: string;
  tasks: TaskNode[];
  inCompletedSection: boolean;
}) {
  const [newTaskParent, setNewTaskParent] = useState<TaskNode | null>(null);
  const displayNewTaskParent = usePersistentValue(newTaskParent);
  const [taskToEdit, setTaskToEdit] = useState<TaskNode | null>(null);
  const displayTaskToEdit = usePersistentValue(taskToEdit);
  const [taskToDelete, setTaskToDelete] = useState<TaskNode | null>(null);
  const displayTaskToDelete = usePersistentValue(taskToDelete);
  const [taskToArchive, setTaskToArchive] = useState<TaskNode | null>(null);
  const displayTaskToArchive = usePersistentValue(taskToArchive);
  const [taskForTimeEntries, setTaskForTimeEntries] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const {
    values,
    setValues,
    resetForm,
    prefillForm,
    submitCreate,
    submitUpdate,
  } = useTaskForm(projectId);

  function handleEditClick(task: TaskNode) {
    setTaskToEdit(task);
    prefillForm(task);
  }

  const { showToast } = useToast();

  async function handleCreateTask(
    event: React.SubmitEvent<HTMLFormElement>,
    parentId: string | null,
  ) {
    event.preventDefault();
    event.stopPropagation();
    setLoading(true);
    const result = await submitCreate(parentId);
    if (result.success) {
      setNewTaskParent(null);
      showToast(
        <SuccessToast
          title="Neue Aufgabe erstellt"
          description="Die Aufgabe wurde erfolgreich erstellt."
        />,
      );
    } else {
      showToast(
        <ErrorToast
          title="Die Aufgabe konnte nicht erstellt werden"
          description="Bitte probiere es noch einmal"
        />,
      );
    }
    setLoading(false);
  }

  async function handleUpdateTask(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!taskToEdit) return;
    setLoading(true);
    const result = await submitUpdate(taskToEdit.id);
    if (result.success) {
      showToast(
        <SuccessToast
          title="Aufgabe aktualisiert"
          description="Die Aufgabe wurde erfolgreich aktualisiert."
        />,
      );
      setTaskToEdit(null);
    } else {
      showToast(
        <ErrorToast
          title="Die Aufgabe konnte nicht aktualisiert werden"
          description="Bitte probiere es noch einmal."
        />,
      );
    }
    setLoading(false);
  }

  async function handleDeleteTask() {
    if (!taskToDelete) return;
    setLoading(true);

    const result = await deleteTaskAction({ taskId: taskToDelete.id });

    if (result.success) {
      showToast(
        <SuccessToast
          title="Aufgabe gelöscht"
          description="Die Aufgabe wurde erfolgreich gelöscht."
        />,
      );
      setTaskToDelete(null);
    } else {
      showToast(
        <ErrorToast
          title="Die Aufgabe konnte nicht gelöscht werden"
          description="Bitte probiere es noch einmal."
        />,
      );
    }
    setLoading(false);
  }

  async function handleArchiveTask() {
    if (!taskToArchive) return;
    setLoading(true);

    const result = await archiveTaskAction({ taskId: taskToArchive.id });

    if (result.success) {
      showToast(
        <SuccessToast
          title="Aufgabe archiviert"
          description="Die Aufgabe wurde erfolgreich archiviert."
        />,
      );
      setTaskToArchive(null);
    } else {
      showToast(
        <ErrorToast
          title="Fehler"
          description="Die Aufgabe konnte nicht archiviert werden."
        />,
      );
    }
    setLoading(false);
  }

  return (
    <>
      {tasks.map((task) => (
        <Tasks
          key={task.id}
          projectId={projectId}
          task={task}
          isRoot={true}
          setNewTaskParent={setNewTaskParent}
          setTaskToEdit={handleEditClick}
          setTaskToDelete={setTaskToDelete}
          setTaskToArchive={setTaskToArchive}
          setTaskForTimeEntries={setTaskForTimeEntries}
          inCompletedSection={inCompletedSection}
        />
      ))}
      <>
        <TaskDialog
          open={!!newTaskParent}
          onClose={() => {
            setNewTaskParent(null);
            resetForm();
          }}
          title="Neue Aufgabe erstellen"
          description={`Erstelle eine neue Aufgabe unter "${displayNewTaskParent?.title}"`}
          submitButtonText="Aufgabe erstellen"
          onSubmit={(e) =>
            handleCreateTask(e, displayNewTaskParent?.id ?? null)
          }
          projectId={projectId}
        />

        <TaskDialog
          open={!!taskToEdit}
          onClose={() => {
            setTaskToEdit(null);
            resetForm();
          }}
          title="Aufgabe bearbeiten"
          description={`Bearbeite die Aufgabe "${displayTaskToEdit?.title}"`}
          submitButtonText="Aufgabe bearbeiten"
          onSubmit={handleUpdateTask}
          projectId={projectId}
        />

        <Alert
          open={!!taskToDelete}
          onClose={() => {
            setTaskToDelete(null);
          }}
        >
          <AlertTitle>
            Aufgabe „{displayTaskToDelete?.title}“ löschen?
          </AlertTitle>
          <AlertDescription>
            {displayTaskToDelete && displayTaskToDelete.children.length > 0
              ? `Aufgabe „${displayTaskToDelete.title}" und alle Unteraufgaben werden gelöscht.`
              : `Aufgabe „${displayTaskToDelete?.title}" wird gelöscht.`}
          </AlertDescription>
          <AlertActions>
            <Button
              plain
              onClick={() => {
                setTaskToDelete(null);
              }}
              disabled={loading}
            >
              Abbrechen
            </Button>
            <Button color="red" onClick={handleDeleteTask} disabled={loading}>
              Löschen
            </Button>
          </AlertActions>
        </Alert>

        <Alert
          open={!!taskToArchive}
          onClose={() => {
            setTaskToArchive(null);
          }}
        >
          <AlertTitle>
            Aufgabe „{displayTaskToArchive?.title}“ archivieren?
          </AlertTitle>
          <AlertDescription>
            {displayTaskToArchive && displayTaskToArchive.children.length > 0
              ? `Aufgabe „${displayTaskToArchive.title}“ und alle Unteraufgaben werden archiviert.`
              : `Aufgabe „${displayTaskToArchive?.title}“ wird archiviert.`}
          </AlertDescription>
          <AlertActions>
            <Button
              plain
              onClick={() => {
                setTaskToArchive(null);
              }}
              disabled={loading}
            >
              Abbrechen
            </Button>
            <Button onClick={handleArchiveTask} disabled={loading}>
              Archivieren
            </Button>
          </AlertActions>
        </Alert>

        <TimeEntryDialog
          task={taskForTimeEntries}
          onClose={() => setTaskForTimeEntries(null)}
        />
      </>
    </>
  );
}
