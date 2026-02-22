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
import { ErrorMessage, Field, FieldGroup, Label } from "@/components/fieldset";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { handleInput } from "@/lib/formUtils";

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
    event: React.FormEvent<HTMLFormElement>,
    parentId: string | null,
  ) {
    event.preventDefault();
    event.stopPropagation();
    const result = await submitCreate(parentId);
    if (result.success) {
      setNewTaskParent(null);
    }
    // TODO error handling
  }

  async function handleUpdateTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!taskToEdit) return;
    const result = await submitUpdate(taskToEdit.id);
    if (result.success) {
      setTaskToEdit(null);
    }
    // TODO error handling
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
          />
        ))}
      <>
        <Dialog
          open={!!newTaskParent}
          onClose={() => {
            setNewTaskParent(null);
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
                  <Label>Abgeschätzte Dauer</Label>
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
              <DialogActions>
                <Button
                  plain
                  onClick={() => {
                    setNewTaskParent(null);
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
                  <Label>Abgeschätzte Dauer</Label>
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
              <DialogActions>
                <Button
                  plain
                  onClick={() => {
                    setTaskToEdit(null);
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
      </>
    </>
  );
}
