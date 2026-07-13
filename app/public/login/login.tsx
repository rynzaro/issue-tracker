"use client";

import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/button";
import { Checkbox, CheckboxField } from "@/components/checkbox";
import { Field, Label } from "@/components/fieldset";
import { Heading } from "@/components/heading";
import { Input } from "@/components/input";
import { ErrorText, Strong, SecondaryText, TextLink } from "@/components/text";
import { authenticate } from "@/lib/actions/auth.actions";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";

export default function Login() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/s/main";
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );

  return (
    <AuthLayout>
      <form
        action={formAction}
        className="grid w-full max-w-sm grid-cols-1 gap-8"
      >
        <Heading>Sign in to your account</Heading>
        <Field>
          <Label>Email</Label>
          <Input type="email" name="email" />
        </Field>
        <Field>
          <Label>Password</Label>
          <Input type="password" name="password" />
        </Field>
        <div className="flex items-center justify-between">
          <CheckboxField>
            <Checkbox name="remember" />
            <Label>Remember me</Label>
          </CheckboxField>
          <SecondaryText>
            <TextLink href="/public/forgot-password">
              <Strong>Forgot password?</Strong>
            </TextLink>
          </SecondaryText>
        </div>
        <input type="hidden" name="redirectTo" value={callbackUrl} />
        <div>
          {errorMessage && (
            <ErrorText className="mb-4" role="alert">
              {errorMessage}
            </ErrorText>
          )}
          <Button type="submit" className="w-full" aria-disabled={isPending}>
            Login
          </Button>
        </div>
        <SecondaryText>
          Don’t have an account?{" "}
          <TextLink href="/public/sign-up">
            <Strong>Sign up</Strong>
          </TextLink>
        </SecondaryText>
      </form>
    </AuthLayout>
  );
}
