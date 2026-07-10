"use client";

import { useState } from "react";
import { useTaskForm } from "@/lib/hooks";
import { Button } from "@/components/button";
import TaskDialog from "./taskDialog";
import {
  ErrorToast,
  SuccessToast,
  useToast,
} from "@/lib/notification/toastProvider";

export default function NewRootTask({ projectId }: { projectId: string }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const { values, setValues, resetForm, submitCreate } = useTaskForm(projectId);

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
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
        values={values}
        setValues={setValues}
      />
    </>
  );
}
