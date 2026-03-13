"use client";

import { useState } from "react";
import { useTaskForm } from "@/lib/hooks";
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
import {
  ErrorToast,
  SuccessToast,
  useToast,
} from "@/lib/notification/toastProvider";
import TodoList from "./todoList";
import { Checkbox } from "@/components/checkbox";
import TaskDialog from "./taskDialog";

export default function NewRootTask({ projectId }: { projectId: string }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const { values, setValues, resetForm, submitCreate } = useTaskForm(projectId);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    const result = await submitCreate(null);
    if (result.success) {
      showToast(
        <SuccessToast
          title="Neue Aufgabe erstellt"
          description="Die Aufgabe wurde erfolgreich erstellt."
        />,
        2000,
      );
      setOpen(false);
    } else {
      showToast(
        <ErrorToast
          title="Fehler"
          description="Die Aufgabe konnte nicht erstellt werden."
        />,
      );
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} responsive={false}>
        Neue Aufgabe
      </Button>
      <TaskDialog
        open={open}
        onClose={() => {
          setOpen(false);
          resetForm();
        }}
        title="Neue Aufgabe erstellen"
        description="Erstelle eine neue Aufgabe im Projekt"
        submitButtonText="Aufgabe erstellen"
        onSubmit={handleSubmit}
        projectId={projectId}
      />
    </>
  );
}
