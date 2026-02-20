import NotFoundError from "@/components/not-found-error";
import { Text } from "@/components/text";
import { getUserProjectWithTasksAction } from "@/lib/actions/project.actions";
import Tasks from "./tasks";
import { Heading, Subheading } from "@/components/heading";

export default async function Page({
  params,
}: {
  params: Promise<{ "project-id": string }>;
}) {
  const { "project-id": projectId } = await params;

  const project = await getUserProjectWithTasksAction(projectId);

  if (!project.success) {
    return (
      <NotFoundError
        subject="Projekt nicht gefunden"
        description="Das angeforderte Projekt existiert nicht."
      />
    );
  }

  console.log(project.data);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-4">
        <Heading>{project.data.name}</Heading>
        <Subheading level={1} className="text-gray-500">
          Task Manager
        </Subheading>
      </div>
      <Tasks projectId={projectId} tasks={project.data.tasks} />
    </div>
  );
}
