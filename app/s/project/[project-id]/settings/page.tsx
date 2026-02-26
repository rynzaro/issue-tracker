import { auth } from "@/auth";
import { getUserProjectById } from "@/lib/services/project.service";
import NotFoundError from "@/components/not-found-error";
import PageNarrowLayout from "@/components/pageNarrowLayout";
import PrimaryHeader from "@/components/primaryHeader";
import UpdateProjectForm from "./updateProjectForm";
import DeleteProjectSection from "./deleteProjectSection";
import { Divider } from "@/components/divider";
import { redirect } from "next/navigation";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ "project-id": string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/public/login");
  }

  const { "project-id": projectId } = await params;

  const result = await getUserProjectById({
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

  const project = result.data;

  return (
    <PageNarrowLayout>
      <PrimaryHeader
        title="Projekteinstellungen"
        info={`Einstellungen für „${project.name}"`}
      />
      <UpdateProjectForm
        projectId={project.id}
        initialName={project.name}
        initialDescription={project.description ?? ""}
        initialIsDefault={project.isDefault}
      />
      <Divider className="my-10" />
      <DeleteProjectSection projectId={project.id} projectName={project.name} />
    </PageNarrowLayout>
  );
}
