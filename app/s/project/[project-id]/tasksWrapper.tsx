"use client";

import { TaskNode } from "@/lib/schema/task";
import Tasks from "./tasks";
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
import { deleteTaskAction } from "@/lib/actions/task.actions";

export default function TasksWrapper({
  projectId,
  tasks,
}: {
  projectId: string;
  tasks: TaskNode[];
}) {
  const [newTaskParent, setNewTaskParent] = useState<TaskNode | null>(null);
  const displayNewTaskParent = usePersistentValue(newTaskParent);
  const [taskToEdit, setTaskToEdit] = useState<TaskNode | null>(null);
  const displayTaskToEdit = usePersistentValue(taskToEdit);
  const [taskToDelete, setTaskToDelete] = useState<TaskNode | null>(null);
  const displayTaskToDelete = usePersistentValue(taskToDelete);
  const [loading, setLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
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

  async function handleCreateTask(
    event: React.SubmitEvent<HTMLFormElement>,
    parentId: string | null,
  ) {
    event.preventDefault();
    event.stopPropagation();
    setLoading(true);
    setCreateError(null);
    const result = await submitCreate(parentId);
    if (result.success) {
      setNewTaskParent(null);
    } else {
      const msg =
        typeof result.error === "string" ? result.error : result.error.message;
      setCreateError(msg);
    }
    setLoading(false);
  }

  async function handleUpdateTask(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!taskToEdit) return;
    setLoading(true);
    setUpdateError(null);
    const result = await submitUpdate(taskToEdit.id);
    if (result.success) {
      setTaskToEdit(null);
    } else {
      const msg =
        typeof result.error === "string" ? result.error : result.error.message;
      setUpdateError(msg);
    }
    setLoading(false);
  }

  async function handleDeleteTask() {
    if (!taskToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);

    const result = await deleteTaskAction({ taskId: taskToDelete.id });

    if (result.success) {
      setTaskToDelete(null);
    } else {
      setDeleteError(result.error.message);
    }
    setDeleteLoading(false);
  }

  return (
    <>
      {tasks.length > 0 &&
        tasks.map((task) => (
          <Tasks
            key={task.id}
            projectId={projectId}
            task={task}
            isRoot={true}
            setNewTaskParent={setNewTaskParent}
            setTaskToEdit={handleEditClick}
            setTaskToDelete={setTaskToDelete}
          />
        ))}
      <>
        <Dialog
          open={!!newTaskParent}
          onClose={() => {
            setNewTaskParent(null);
            setCreateError(null);
            resetForm();
          }}
        >
          <DialogTitle>Neue Aufgabe erstellen</DialogTitle>
          <DialogDescription>
            Erstelle eine neue Aufgabe unter "{displayNewTaskParent?.title}"
          </DialogDescription>
          <form
            onSubmit={(e) => handleCreateTask(e, newTaskParent?.id ?? null)}
          >
            <DialogBody>
              <FieldGroup>
                <Field>
                  <Label>Titel</Label>
                  <Input
                    name="title"
                    value={values.title.value}
                    invalid={!!values.title.error}
                    onChange={(e) => handleInput(e, setValues)}
                  />
                  {values.title.error && (
                    <ErrorMessage>{values.title.error}</ErrorMessage>
                  )}
                </Field>
                <Field>
                  <Label>Geschätzte Dauer</Label>
                  <Input
                    inputMode="numeric"
                    name="estimatedDuration"
                    pattern="[0-9]*"
                    value={values.estimatedDuration.value}
                    onChange={(e) => {
                      if (/^\d*$/.test(e.target.value)) {
                        handleInput(e, setValues);
                      }
                    }}
                  />
                </Field>
                <Field>
                  <Label>Beschreibung</Label>
                  <Textarea
                    name="description"
                    rows={4}
                    value={values.description.value}
                    invalid={!!values.description.error}
                    onChange={(e) => handleInput(e, setValues)}
                  />
                  {values.description.error && (
                    <ErrorMessage>{values.description.error}</ErrorMessage>
                  )}
                </Field>
              </FieldGroup>
              {createError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {createError}
                </p>
              )}
              <DialogActions>
                <Button
                  plain
                  onClick={() => {
                    setNewTaskParent(null);
                    setCreateError(null);
                    resetForm();
                  }}
                >
                  Zurück
                </Button>
                <Button type="submit"> Aufgabe erstellen</Button>
              </DialogActions>
            </DialogBody>
          </form>
        </Dialog>

        <Dialog
          open={!!taskToEdit}
          onClose={() => {
            setTaskToEdit(null);
            setUpdateError(null);
            resetForm();
          }}
        >
          <DialogTitle>Aufgabe bearbeiten</DialogTitle>
          <DialogDescription>
            Bearbeite die Aufgabe "{displayTaskToEdit?.title}"
          </DialogDescription>
          <form onSubmit={handleUpdateTask}>
            <DialogBody>
              <FieldGroup>
                <Field>
                  <Label>Titel</Label>
                  <Input
                    name="title"
                    value={values.title.value}
                    invalid={!!values.title.error}
                    onChange={(e) => handleInput(e, setValues)}
                  />
                  {values.title.error && (
                    <ErrorMessage>{values.title.error}</ErrorMessage>
                  )}
                </Field>
                <Field>
                  <Label>Geschätzte Dauer</Label>
                  <Input
                    inputMode="numeric"
                    name="estimatedDuration"
                    pattern="[0-9]*"
                    value={values.estimatedDuration.value}
                    onChange={(e) => {
                      if (/^\d*$/.test(e.target.value)) {
                        handleInput(e, setValues);
                      }
                    }}
                  />
                </Field>
                <Field>
                  <Label>Beschreibung</Label>
                  <Textarea
                    name="description"
                    rows={4}
                    value={values.description.value}
                    invalid={!!values.description.error}
                    onChange={(e) => handleInput(e, setValues)}
                  />
                  {values.description.error && (
                    <ErrorMessage>{values.description.error}</ErrorMessage>
                  )}
                </Field>
              </FieldGroup>
              {updateError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {updateError}
                </p>
              )}
              <DialogActions>
                <Button
                  plain
                  onClick={() => {
                    setTaskToEdit(null);
                    setUpdateError(null);
                    resetForm();
                  }}
                >
                  Zurück
                </Button>
                <Button type="submit"> Aufgabe bearbeiten</Button>
              </DialogActions>
            </DialogBody>
          </form>
        </Dialog>

        <Alert
          open={!!taskToDelete}
          onClose={() => {
            setTaskToDelete(null);
            setDeleteError(null);
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
          {deleteError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {deleteError}
            </p>
          )}
          <AlertActions>
            <Button
              plain
              onClick={() => {
                setTaskToDelete(null);
                setDeleteError(null);
              }}
              disabled={deleteLoading}
            >
              Abbrechen
            </Button>
            <Button
              color="red"
              onClick={handleDeleteTask}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Löschen…" : "Löschen"}
            </Button>
          </AlertActions>
        </Alert>
      </>
    </>
  );
}
