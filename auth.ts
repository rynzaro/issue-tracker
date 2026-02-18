import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { z } from "zod";
import client from "@/lib/prisma";
import { User } from "@prisma/client";
import bcrypt from "bcrypt";

async function getUser(email: string): Promise<User | undefined> {
  try {
    const user = await client.user.findFirst({
      where: { email: email },
    });
    if (!user) return undefined;
    return user;
  } catch (error) {
    console.error("Failed to fetch user:", error);
    throw new Error("Failed to fetch user.");
  }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await getUser(email);
          if (!user) return null;
          const passwordsMatch = await bcrypt.compare(password, user.password);

          if (passwordsMatch) {
            return {
              id: user.id,
              email: user.email,
            };
          }
        }

        console.log("Invalid credentials");
        return null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      console.log("JWT callback - user:", user);
      console.log("JWT callback - token before:", token);
      if (user) {
        token.id = user.id;
      }
      console.log("JWT callback - token after:", token);
      return token;
    },
    session({ session, token }) {
      console.log("Session callback - token:", token);
      console.log("Session callback - session before:", session);
      if (session.user) {
        session.user.id = token.sub as string;
      }
      console.log("Session callback - session after:", session);
      return session;
    },
  },
});
