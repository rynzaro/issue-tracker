import { Suspense } from "react";
import Login from "./login";
import client from "@/lib/prisma";

export default async function Page() {
  const users = await client.user.findMany();
  for (const user of users) {
    console.log(`User: ${user.email}`);
  }
  return <Login />;
}
