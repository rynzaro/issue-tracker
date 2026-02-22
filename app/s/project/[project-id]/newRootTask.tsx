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

export default function NewRootTask({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const { values, setValues, resetForm, submitCreate } = useTaskForm(projectId);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    const result = await submitCreate(null);
    if (result.success) {
      setOpen(false);
    }
    // TODO error handling
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Neue Aufgabe</Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          resetForm();
        }}
      >
        <DialogTitle>Neue Aufgabe erstellen</DialogTitle>
        <DialogDescription>
          Erstelle eine neue Aufgabe im Projekt
        </DialogDescription>
        <form onSubmit={handleSubmit}>
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
            <DialogActions>
              <Button
                plain
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
              >
                Zurück
              </Button>
              <Button type="submit">Aufgabe erstellen</Button>
            </DialogActions>
          </DialogBody>
        </form>
      </Dialog>
    </>
  );
}
