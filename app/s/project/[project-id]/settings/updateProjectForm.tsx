"use client";

import { useState } from "react";
import { Button } from "@/components/button";
import {
  Description,
  Field,
  FieldGroup,
  Fieldset,
  Label,
} from "@/components/fieldset";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { SwitchField, Switch } from "@/components/switch";
import { updateProjectAction } from "@/lib/actions/project.actions";

export default function UpdateProjectForm({
  projectId,
  initialName,
  initialDescription,
  initialIsDefault,
}: {
  projectId: string;
  initialName: string;
  initialDescription: string;
  initialIsDefault: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [isDefault, setIsDefault] = useState(initialIsDefault);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Tracks the last-saved values so isPristine stays correct after saves
  const [baseline, setBaseline] = useState({
    name: initialName,
    description: initialDescription,
    isDefault: initialIsDefault,
  });

  const isPristine =
    name === baseline.name &&
    description === baseline.description &&
    isDefault === baseline.isDefault;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Der Projektname muss mindestens 2 Zeichen lang sein.");
      return;
    }
    setLoading(true);
    setError(null);
    setSaved(false);

    const trimmedName = name.trim();
    const result = await updateProjectAction({
      id: projectId,
      name: trimmedName !== baseline.name ? trimmedName : undefined,
      description:
        description !== baseline.description
          ? (description || null)
          : undefined,
      isDefault: isDefault && !baseline.isDefault ? true : undefined,
    });

    setLoading(false);

    if (result.success) {
      setBaseline({ name: trimmedName, description, isDefault });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError(result.error.message);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Fieldset>
        <FieldGroup>
          <Field>
            <Label>Projektname</Label>
            <Input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field>
            <Label>Beschreibung</Label>
            <Textarea
              name="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <SwitchField>
            <Label>Standardprojekt</Label>
            <Description>
              {initialIsDefault
                ? "Dieses Projekt ist das Standardprojekt. Wähle ein anderes Projekt als Standard, um dies zu ändern."
                : "Als Standardprojekt festlegen"}
            </Description>
            <Switch
              checked={isDefault}
              onChange={setIsDefault}
              disabled={initialIsDefault}
              color="blue"
              name="isDefault"
            />
          </SwitchField>
          <div className="flex items-center gap-4">
            <Button type="submit" disabled={loading || isPristine}>
              {loading ? "Speichern…" : "Speichern"}
            </Button>
            {saved && (
              <span className="text-sm text-green-600 dark:text-green-400">
                Gespeichert
              </span>
            )}
            {error && (
              <span className="text-sm text-red-600 dark:text-red-400">
                {error}
              </span>
            )}
          </div>
        </FieldGroup>
      </Fieldset>
    </form>
  );
}
