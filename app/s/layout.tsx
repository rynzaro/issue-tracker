import { auth } from "@/auth";
import { NavbarApp } from "@/components/navbar-app";
import NoAccessError from "@/components/no-access-error";
import { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

export default async function Layout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session) {
    return (
      <html className="bg-white lg:bg-zinc-100 dark:bg-zinc-900 dark:lg:bg-zinc-950">
        <body>
          <NoAccessError
            subject="Zugriff verweigert"
            description="Du musst dich anmelden, um auf diesen Bereich zuzugreifen."
          />
        </body>
      </html>
    );
  }

  return (
    <SessionProvider session={session}>
      <NavbarApp emailAddress={session?.user?.email || "Unknown User"}>
        {children}
      </NavbarApp>
    </SessionProvider>
  );
}
