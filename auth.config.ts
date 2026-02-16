import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/public/login",
  },
  providers: [],
} satisfies NextAuthConfig;
