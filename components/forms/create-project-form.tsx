"use client";

import { SubmitEvent, useState } from "react";
import { Button } from "../button";
import { Field, FieldGroup, Fieldset, Label } from "../fieldset";
import { Input } from "../input";
import { Textarea } from "../textarea";
import { useRouter } from "next/navigation";
import { FormState } from "@/lib/formUtils";
import {
  createProjectAction,
  CreateProjectParams,
} from "@/lib/actions/project.actions";

export default function CreateProjectForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [values, setValues] = useState<
    FormState<{ name: string; description: string }>
  >({
    name: {
      value: "",
      required: true,
      touched: false,
    },
    description: {
      value: "",
      required: true,
      touched: false,
    },
  });

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    console.log("submit", values);
    const formData = new FormData(e.currentTarget);
    const body: CreateProjectParams = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
    };
    setLoading(true);
    const result = await createProjectAction(body);
    setLoading(false);
    if (result.success) {
      // TODO success notification
      router.push(`/s/project/${result.data.id}`);
    } else {
      //TODO handle error with notifications
      console.error(result.error);
    }
  }
  return (
    <form onSubmit={handleSubmit}>
      <Fieldset>
        <FieldGroup>
          <Field>
            <Label>Projektname</Label>
            <Input name="name" />
          </Field>
          <Field>
            <Label>Beschreibung</Label>
            <Textarea name="description" rows={2} />
          </Field>
          <Button type="submit" disabled={loading}>
            Projekt erstellen
          </Button>
        </FieldGroup>
      </Fieldset>
    </form>
  );
}
