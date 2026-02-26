import { auth } from "@/auth";
import NotFoundError from "@/components/not-found-error";
import { getProjectTaskTree } from "@/lib/services/project.service";
import { Heading, Subheading } from "@/components/heading";
import NewRootTask from "./newRootTask";
import { Divider } from "@/components/divider";
import TasksWrapper from "./tasksWrapper";
import { Link } from "@/components/link";
import { Cog8ToothIcon } from "@heroicons/react/24/outline";
import { redirect } from "next/navigation";
import SetDefaultButton from "./setDefaultButton";

export default async function Page({
  params,
}: {
  params: Promise<{ "project-id": string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/public/login");
  }

  const { "project-id": projectId } = await params;

  const project = await getProjectTaskTree({
    userId: session.user.id,
    projectId,
  });

  if (!project.success) {
    return (
      <NotFoundError
        subject="Projekt nicht gefunden"
        description="Das angeforderte Projekt existiert nicht."
      />
    );
  }

  const tasks = project.data.tasks;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between">
        <div className="flex items-baseline gap-4">
          <Heading>{project.data.name}</Heading>
          <Subheading level={1} className="text-gray-500">
            Aufgabenverwaltung
          </Subheading>
        </div>
        <div className="flex items-center gap-2">
          {!project.data.isDefault && (
            <SetDefaultButton
              projectId={projectId}
              projectName={project.data.name}
            />
          )}
          <Link
            href={`/s/project/${projectId}/settings`}
            className="inline-flex items-center justify-center w-10 h-10 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Projekteinstellungen"
          >
            <Cog8ToothIcon className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
          </Link>
          <NewRootTask projectId={projectId} />
        </div>
      </div>
      <Divider className="my-0" />
      <TasksWrapper projectId={projectId} tasks={tasks} />
    </div>
  );
}
