"use client";

import { CreateTaskParams, TaskNode } from "@/lib/schema/task";
import Tasks from "./tasks";
import { useState } from "react";
import { Button } from "@/components/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "@/components/dialog";
import { Field, FieldGroup, Label } from "@/components/fieldset";
import { Input } from "@/components/input";
import TextInput from "@/components/textInput";
import { Textarea } from "@/components/textarea";
import {
  extractFormStateValues,
  FormState,
  handleInput,
} from "@/lib/formUtils";
import { createTaskAction } from "@/lib/actions/task.actions";
import { useRouter } from "next/navigation";

export default function TasksWrapper({
  projectId,
  tasks,
}: {
  projectId: string;
  tasks: TaskNode[];
}) {
  const [newTaskParent, setNewTaskParent] = useState<TaskNode | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<TaskNode | null>(null);
  const router = useRouter();
  const [values, setValues] = useState<
    FormState<{ title: string; estimatedDuration: string; description: string }>
  >({
    title: {
      value: "",
      required: true,
      touched: false,
    },
    estimatedDuration: {
      value: "",
      required: false,
      touched: false,
    },
    description: {
      value: "",
      required: false,
      touched: false,
    },
  });
  function resetForm() {
    setValues({
      title: {
        value: "",
        required: true,
        touched: false,
      },
      estimatedDuration: {
        value: "",
        required: false,
        touched: false,
      },
      description: {
        value: "",
        required: false,
        touched: false,
      },
    });
  }

  function handleEditClick(task: TaskNode) {
    setTaskToEdit(task);
    setValues((prev) => ({
      ...prev,
      title: {
        ...prev.title,
        value: task.title ?? "",
      },
      estimatedDuration: {
        ...prev.estimatedDuration,
        value: task.estimate ? String(task.estimate) : "",
      },
      description: {
        ...prev.description,
        value: task.description ?? "",
      },
    }));
  }

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    // check if password has the right format

    const body: CreateTaskParams = {
      title: values.title.value,
      projectId: projectId,
      description: values.description.value,
      estimate: values.estimatedDuration.value
        ? (parseInt(values.estimatedDuration.value) ?? undefined)
        : undefined,
      parentId: newTaskParent?.id ?? null,
    };

    const newTask = await createTaskAction({ createTaskParams: body });
    if (!newTask.success) {
      //TODO error handling
      return;
    }
    // TODO success notification
    setNewTaskParent(null);
    resetForm();
    router.refresh();
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
            Erstelle eine neue Aufgabe unter "{newTaskParent?.title}"
          </DialogDescription>
          <form onSubmit={handleSubmit}>
            <DialogBody>
              <FieldGroup>
                <Field>
                  <Label>Titel</Label>
                  <Input
                    name="title"
                    value={values.title.value}
                    onChange={(e) => handleInput(e, setValues)}
                  />
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
                    onChange={(e) => handleInput(e, setValues)}
                  />
                </Field>
              </FieldGroup>
              <DialogActions>
                <Button plain onClick={() => setNewTaskParent(null)}>
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
            Bearbeite die Aufgabe "{taskToEdit?.title}"
          </DialogDescription>
          <form onSubmit={handleSubmit}>
            <DialogBody>
              <FieldGroup>
                <Field>
                  <Label>Titel</Label>
                  <Input
                    name="title"
                    value={values.title.value}
                    onChange={(e) => handleInput(e, setValues)}
                  />
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
                    onChange={(e) => handleInput(e, setValues)}
                  />
                </Field>
              </FieldGroup>
              <DialogActions>
                <Button plain onClick={() => setNewTaskParent(null)}>
                  Zurück
                </Button>
                <Button type="submit"> Aufgabe erstellen</Button>
              </DialogActions>
            </DialogBody>
          </form>
        </Dialog>
      </>
    </>
  );
}
