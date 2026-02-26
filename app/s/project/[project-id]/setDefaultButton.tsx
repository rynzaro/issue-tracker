"use client";

import { useState } from "react";
import { Button } from "@/components/button";
import { StarIcon } from "@heroicons/react/24/outline";
import {
  Alert,
  AlertActions,
  AlertDescription,
  AlertTitle,
} from "@/components/alert";
import { updateProjectAction } from "@/lib/actions/project.actions";

export default function SetDefaultButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSetDefault() {
    setLoading(true);
    setError(null);

    const result = await updateProjectAction({
      id: projectId,
      isDefault: true,
    });

    setLoading(false);

    if (result.success) {
      setShowConfirm(false);
    } else {
      setError(result.error.message);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="inline-flex items-center justify-center w-10 h-10 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
        aria-label="Als Standardprojekt festlegen"
        title="Als Standardprojekt festlegen"
      >
        <StarIcon className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
      </button>

      <Alert
        open={showConfirm}
        onClose={() => {
          setShowConfirm(false);
          setError(null);
        }}
      >
        <AlertTitle>„{projectName}" als Standardprojekt festlegen?</AlertTitle>
        <AlertDescription>
          Dieses Projekt wird als Startseite angezeigt. Das bisherige
          Standardprojekt wird zurückgesetzt.
        </AlertDescription>
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <AlertActions>
          <Button
            plain
            onClick={() => setShowConfirm(false)}
            disabled={loading}
          >
            Abbrechen
          </Button>
          <Button onClick={handleSetDefault} disabled={loading}>
            {loading ? "Wird gesetzt…" : "Als Standard festlegen"}
          </Button>
        </AlertActions>
      </Alert>
    </>
  );
}
