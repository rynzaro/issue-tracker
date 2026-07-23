"use server";

import { signIn, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

export type AuthenticateResult = {
  kind: "invalid-credentials" | "unknown-error";
  message: string;
  email: string;
};

export async function authenticate(
  prevState: AuthenticateResult | undefined,
  formData: FormData,
): Promise<AuthenticateResult | undefined> {
  try {
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError) {
      const email = String(formData.get("email") ?? "");
      switch (error.type) {
        case "CredentialsSignin":
          return {
            kind: "invalid-credentials",
            message: "The email or password is incorrect.",
            email,
          };
        default:
          return {
            kind: "unknown-error",
            message: "Something went wrong.",
            email,
          };
      }
    }
    throw error;
  }
}

export async function performLogout() {
  try {
    await signOut({ redirect: false });
  } catch (error) {
    console.error("Logout error:", error);
  }

  // redirect() throws a control-flow error (NEXT_REDIRECT) that must not be caught
  redirect("/public/login");
}
