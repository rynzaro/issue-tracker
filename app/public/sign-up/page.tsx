import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/button";
import { Field, Label } from "@/components/fieldset";
import { Heading } from "@/components/heading";
import { Input } from "@/components/input";
import { Strong, Text, TextLink } from "@/components/text";

export default function Page() {
  return (
    <AuthLayout>
      <form
        action="#"
        method="POST"
        className="grid w-full max-w-sm grid-cols-1 gap-8"
      >
        <Heading>Create your account</Heading>
        <Field>
          <Label>Email</Label>
          <Input type="email" name="email" />
        </Field>
        <Field>
          <Label>Password</Label>
          <Input type="password" name="password" autoComplete="new-password" />
        </Field>
        <Field>
          <Label>Repeat Password</Label>
          <Input type="password" name="password" autoComplete="new-password" />
        </Field>

        <Button type="submit" className="w-full">
          Create account
        </Button>
        <Text>
          Already have an account?{" "}
          <TextLink href="/public/login">
            <Strong>Sign in</Strong>
          </TextLink>
        </Text>
      </form>
    </AuthLayout>
  );
}
