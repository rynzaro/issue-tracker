import NotFoundError from "@/components/not-found-error";
import { getUserProjectWithTasksAndChildrenAction } from "@/lib/actions/project.actions";
import Tasks from "./tasks";
import { Heading, Subheading } from "@/components/heading";
import NewRootTask from "./newRootTask";
import { Button } from "@/components/button";
import { Divider } from "@/components/divider";
import TasksWrapper from "./tasksWrapper";

export default async function Page({
  params,
}: {
  params: Promise<{ "project-id": string }>;
}) {
  const { "project-id": projectId } = await params;

  const project = await getUserProjectWithTasksAndChildrenAction(projectId);

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
            Task Manager
          </Subheading>
        </div>
        <Button>Neue Aufgabe</Button>
      </div>
      <Divider className="my-0" />
      <TasksWrapper projectId={projectId} tasks={tasks} />
    </div>
  );
}
