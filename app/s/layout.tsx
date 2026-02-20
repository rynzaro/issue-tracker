import { auth } from "@/auth";
import { NavbarApp } from "@/components/navbar-app";
import NoAccessError from "@/components/no-access-error";
import { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { getProjectsByUser } from "@/lib/services/project.service";

export default async function Layout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
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

  const projectsRes = await getProjectsByUser(session.user.id);

  // TODO proper error handling
  if (!projectsRes.success) {
    return (
      <html className="bg-white lg:bg-zinc-100 dark:bg-zinc-900 dark:lg:bg-zinc-950">
        <body>
          <NoAccessError
            subject="Fehler"
            description="Beim Laden deiner Projekte ist ein Fehler aufgetreten. Bitte versuche es später erneut."
          />
        </body>
      </html>
    );
  }

  return (
    <SessionProvider session={session}>
      <NavbarApp
        emailAddress={session?.user?.email || "Unknown User"}
        projects={projectsRes.data}
      >
        {children}
      </NavbarApp>
    </SessionProvider>
  );
}
