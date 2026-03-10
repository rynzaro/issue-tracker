import { auth } from "@/auth";
import NotFoundError from "@/components/not-found-error";
import { getArchivePageData } from "@/lib/services/project.service";
import { Heading, Subheading } from "@/components/heading";
import { Divider } from "@/components/divider";
import { Link } from "@/components/link";
import { redirect } from "next/navigation";
import ArchiveTaskList from "./archiveTaskList";
import { ArrowLeftIcon } from "@heroicons/react/16/solid";

export default async function ArchivePage({
  params,
}: {
  params: Promise<{ "project-id": string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/public/login");
  }

  const { "project-id": projectId } = await params;

  const result = await getArchivePageData({
    userId: session.user.id,
    projectId,
  });

  if (!result.success) {
    return (
      <NotFoundError
        subject="Projekt nicht gefunden"
        description="Das angeforderte Projekt existiert nicht."
      />
    );
  }

  const { project, archivedTasks, deletedTasks, parentMap } = result.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/s/project/${projectId}`}
          className="inline-flex items-center justify-center w-10 h-10 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Zurück zum Projekt"
        >
          <ArrowLeftIcon className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
        </Link>
        <Heading>{project.name} — Archiv</Heading>
      </div>

      <Divider className="my-0" />

      <section>
        <Subheading level={3}>Archiviert</Subheading>
        {archivedTasks.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            Keine archivierten Aufgaben.
          </p>
        ) : (
          <ArchiveTaskList
            tasks={archivedTasks}
            mode="archived"
            parentMap={parentMap}
          />
        )}
      </section>

      <Divider className="my-0" />

      <section>
        <Subheading level={3}>Gelöscht</Subheading>
        {deletedTasks.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            Keine gelöschten Aufgaben.
          </p>
        ) : (
          <ArchiveTaskList
            tasks={deletedTasks}
            mode="deleted"
            parentMap={parentMap}
          />
        )}
      </section>
    </div>
  );
}
