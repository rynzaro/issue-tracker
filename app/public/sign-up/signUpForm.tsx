"use client";

import { CreateAccountParams } from "@/app/api/create-account/route";
import { Button } from "@/components/button";
import { ErrorMessage, Field, Label } from "@/components/fieldset";
import { Heading } from "@/components/heading";
import { Input } from "@/components/input";
import { ErrorText, Strong, Text, TextLink } from "@/components/text";
import {
  extractFormStateValues,
  FormState,
  handleInput,
} from "@/lib/formUtils";
import { validatePassword } from "@/lib/util";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignUpForm() {
  const [loading, setLoading] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [values, setValues] = useState<
    FormState<{ email: string; password: string }>
  >({
    email: {
      value: "",
      required: true,
      touched: false,
    },
    password: {
      value: "",
      required: true,
      touched: false,
    },
  });
  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    // check if password has the right format
    if (!validatePassword(values.password.value)) {
      setValues((prev) => ({
        ...prev,
        password: {
          ...prev.password,
          error:
            "Das Passwort muss mindestens 8 Zeichen lang sein, mindestens einen Buchstaben, eine Zahl und ein Sonderzeichen (!@#$%^&*-) enthalten.",
        },
      }));
    }

    if (values.password.value !== confirmPassword) {
      setValues((prev) => ({
        ...prev,
        password: {
          ...prev.password,
          error: "Die Passwörter stimmen nicht überein.",
        },
      }));
    }

    const body: CreateAccountParams = extractFormStateValues(values);
    setError(null);
    setLoading(true);
    const res = await fetch("/api/create-account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Failed to create account");
      const data = await res.json();
      console.error("Error details:", data);
      return;
    }
    router.push("/public/login");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid w-full max-w-sm grid-cols-1 gap-8"
    >
      <Heading>Create your account</Heading>

      <Field>
        <Label>Email</Label>
        <Input
          name="email"
          onChange={(e) => handleInput(e, setValues)}
          value={values.email.value}
        />
        {values.email.error && (
          <ErrorMessage>{values.email.error}</ErrorMessage>
        )}
      </Field>
      <Field>
        <Label>Password</Label>
        <Input
          type="password"
          name="password"
          onChange={(e) => handleInput(e, setValues)}
          value={values.password.value}
        />
        {values.password.error && (
          <ErrorMessage>{values.password.error}</ErrorMessage>
        )}
      </Field>
      <Field>
        <Label>Confirm Password</Label>
        <Input
          type="password"
          name="confirmPassword"
          onChange={(e) => setConfirmPassword(e.target.value)}
          value={confirmPassword}
        />
      </Field>
      <div>
        {error && <ErrorText className="mb-4">{error}</ErrorText>}{" "}
        <Button type="submit" className="w-full" disabled={loading}>
          Create account
        </Button>
      </div>

      <Text>
        Already have an account?{" "}
        <TextLink href="/public/login">
          <Strong>Sign in</Strong>
        </TextLink>
      </Text>
    </form>
  );
}
