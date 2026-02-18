"use server";

import { signIn, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid credentials.";
        default:
          return "Something went wrong.";
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
