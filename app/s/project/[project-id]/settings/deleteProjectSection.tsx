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

export default function DeleteProjectSection({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    setError(null);

    const result = await deleteProjectAction(projectId);

    if (result.success) {
      router.push("/s/main");
    } else {
      setLoading(false);
      setError(result.error.message);
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
        {error && (
          <span className="text-sm text-red-600 dark:text-red-400">
            {error}
          </span>
        )}
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
