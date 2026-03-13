import { SubmitEvent } from "react";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "@/components/dialog";
import { ErrorMessage, Field, FieldGroup, Label } from "@/components/fieldset";
import { Input } from "@/components/input";
import { useTaskForm } from "@/lib/hooks";
import { handleCheckbox, handleInput } from "@/lib/formUtils";
import { Textarea } from "@/components/textarea";
import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
export default function TaskDialog({
  open,
  onClose,
  title,
  description,
  submitButtonText,
  onSubmit,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  submitButtonText?: string;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => Promise<void>;
  projectId: string;
}) {
  const { values, setValues, resetForm } = useTaskForm(projectId);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
      <form onSubmit={onSubmit}>
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
              <Field className="flex items-center mt-2">
                <Checkbox
                  className="mr-2"
                  checked={values.addSubtaskEstimates.value}
                  onChange={(checked) =>
                    handleCheckbox(checked, setValues, "addSubtaskEstimates")
                  }
                />{" "}
                <Label>Unteraufgabenschätzungen zur Schätzzeit addieren</Label>
              </Field>
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
            <Button plain onClick={onClose}>
              Zurück
            </Button>
            <Button type="submit">{submitButtonText}</Button>
          </DialogActions>
        </DialogBody>
      </form>
    </Dialog>
  );
}
