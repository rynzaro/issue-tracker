"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import {
  Alert,
  AlertActions,
  AlertDescription,
  AlertTitle,
} from "@/components/alert";
import { deleteProjectAction } from "@/lib/actions/project.actions";
import { Subheading } from "@/components/heading";
import { SecondaryText } from "@/components/text";
import { ErrorToast, useToast } from "@/lib/notification/toastProvider";

export default function DeleteProjectSection({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  async function handleDelete() {
    setLoading(true);

    const result = await deleteProjectAction(projectId);

    if (result.success) {
      router.push("/s/main");
    } else {
      setLoading(false);
      // Close the dialog first: while it is open the page outside is inert,
      // so a toast behind it could not be dismissed or read.
      setShowConfirm(false);
      showToast(
        <ErrorToast
          title="Projekt konnte nicht gelöscht werden"
          description={result.error.message}
        />,
      );
    }
  }

  return (
    <div>
      <Subheading level={3} className="text-red-600 dark:text-red-400">
        Gefahrenzone
      </Subheading>
      <SecondaryText className="mt-1">
        Das Löschen eines Projekts kann nicht rückgängig gemacht werden.
      </SecondaryText>
      <div className="mt-4 flex items-center gap-4">
        <Button color="red" onClick={() => setShowConfirm(true)}>
          Projekt löschen
        </Button>
      </div>

      <Alert open={showConfirm} onClose={() => setShowConfirm(false)}>
        <AlertTitle>Projekt „{projectName}" löschen?</AlertTitle>
        <AlertDescription>
          Dieses Projekt und alle zugehörigen Aufgaben werden gelöscht. Diese
          Aktion kann nicht rückgängig gemacht werden.
        </AlertDescription>
        <AlertActions>
          <Button
            plain
            onClick={() => setShowConfirm(false)}
            disabled={loading}
          >
            Abbrechen
          </Button>
          <Button color="red" onClick={handleDelete} disabled={loading}>
            {loading ? "Löschen…" : "Löschen"}
          </Button>
        </AlertActions>
      </Alert>
    </div>
  );
}
