import { auth } from "@/auth";
import { getProjectsByUser } from "@/lib/services/project.service";
import { Heading } from "@/components/heading";
import { SecondaryText } from "@/components/text";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Divider } from "@/components/divider";
import Card from "@/components/card";
import { Link } from "@/components/link";
import NoAccessError from "@/components/no-access-error";
import { redirect } from "next/navigation";

export default async function MainPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/public/login");
  }

  const projectsRes = await getProjectsByUser(session.user.id);

  if (!projectsRes.success) {
    return (
      <NoAccessError
        subject="Fehler"
        description="Beim Laden deiner Projekte ist ein Fehler aufgetreten."
      />
    );
  }

  const projects = projectsRes.data;

  // Redirect to default project if one exists
  const defaultProject = projects.find((p) => p.isDefault);
  if (defaultProject) {
    redirect(`/s/project/${defaultProject.id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Heading>Meine Projekte</Heading>
        <Button href="/s/project/create">Neues Projekt erstellen</Button>
      </div>
      <Divider />
      {projects.length === 0 ? (
        <SecondaryText>
          Du hast noch keine Projekte. Erstelle dein erstes Projekt, um
          loszulegen.
        </SecondaryText>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/s/project/${project.id}`}
              className="no-underline"
            >
              <Card className="hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer h-full">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-950 dark:text-white truncate">
                      {project.name}
                    </span>
                    {project.isDefault && <Badge color="blue">Standard</Badge>}
                  </div>
                  {project.description && (
                    <SecondaryText className="line-clamp-2">
                      {project.description}
                    </SecondaryText>
                  )}
                  <SecondaryText className="text-xs">
                    Erstellt am{" "}
                    {new Date(project.createdAt).toLocaleDateString("de-DE")}
                  </SecondaryText>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
