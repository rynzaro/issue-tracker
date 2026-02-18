import CreateProjectForm from "@/components/forms/create-project-form";
import PageNarrowLayout from "@/components/pageNarrowLayout";
import PrimaryHeader from "@/components/primaryHeader";

export default function Page() {
  return (
    <PageNarrowLayout>
      <PrimaryHeader
        title="Neues Projekt erstellen"
        info="Erstelle ein neues Projekt, in dem du deine Zeiteinträge organisieren kannst."
      />
      <CreateProjectForm />
    </PageNarrowLayout>
  );
}
