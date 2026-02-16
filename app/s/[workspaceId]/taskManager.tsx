"use client";

import PrimaryButton from "@/components/primaryButton";
import TextInput from "@/components/textInput";
import { parseTaskString } from "@/lib/util";
import { useState } from "react";
import { CreateTagParams, CreateTagResponse } from "../../api/create-tag/route";
import { useRouter } from "next/navigation";
import { TaskHierarchy } from "./taskHierarchy";
import { StartNewEntryParams } from "../../api/start-new-entry/route";
import { Tag } from "@/lib/types";

export type TaskNode = {
  name: string;
  fullPath: string;
  depth: number;
  parent: TaskNode | null;
  children: Set<TaskNode>;
  active: boolean;
};

export default function TaskManager({
  workspaceId,
  tags,
}: {
  workspaceId: number;
  tags: (Tag & { active: boolean })[];
}) {
  const [rootName, setRootName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  function buildTaskHierarchy(
    tags: (Tag & { active: boolean })[],
  ): Set<TaskNode> {
    const tagMap = new Map<string, TaskNode>();
    const roots = new Set<TaskNode>();

    for (const tag of tags) {
      const segments = parseTaskString(tag.name);
      if (!segments) continue;

      let currentPath = "";
      let parent: TaskNode | null = null;

      for (const segment of segments) {
        currentPath += (currentPath ? "::T:" : "T:") + segment;

        if (!tagMap.has(currentPath)) {
          const newNode: TaskNode = {
            name: segment,
            fullPath: currentPath,
            depth: currentPath.split("::").length - 1,
            parent,
            children: new Set<TaskNode>(),
            active: tag.active,
          };
          tagMap.set(currentPath, newNode);

          if (parent) {
            parent.children.add(newNode);
          } else {
            roots.add(newNode);
          }
        }

        parent = tagMap.get(currentPath)!; // Update parent even if node exists
      }
    }
    return roots;
  }

  const roots = buildTaskHierarchy(tags);

  async function createTag(name: string): Promise<boolean> {
    const body: CreateTagParams = {
      name: name,
      workspaceId: workspaceId,
    };

    const res = await fetch("/api/create-tag", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(`Failed to create tag: ${data.error.status}`);
      return false;
    }
    const data: CreateTagResponse = await res.json();
    setError(null);
    setSuccess("Tag created successfully");
    return true;
  }

  async function startTask(tag: string) {
    const body: StartNewEntryParams = {
      tags: [tag],
      workspaceId: workspaceId,
      start: new Date(),
      createdWith: "issue-tracker-app",
      description: `Working on ${tag}`,
    };
    const res = await fetch("/api/start-new-entry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      try {
        const data = await res.json();
        console.log(data);
      } catch (e) {
        // Response might be empty or not JSON
        console.log("No JSON response body");
      }
      setError(null);
      setSuccess("Time entry started successfully");
    } else {
      try {
        const data = await res.json();
        setError(`Failed to start time entry: ${data.error?.status}`);
      } catch (e) {
        setError(`Failed to start time entry: ${res.status}`);
      }
    }
    setRootName("");
  }

  return (
    <div className="mt-8 mx-8">
      <TaskHierarchy roots={roots} createTag={createTag} />

      <div className="flex gap-2 mt-8">
        <TextInput
          className="flex-1"
          value={rootName}
          onChange={(e) => setRootName(e.target.value)}
        />

        <PrimaryButton
          className="shrink-0"
          onClick={async () => await createTag("T:" + rootName)}
        >
          Tag erstellen
        </PrimaryButton>
      </div>
      {error && <div className="text-red-600 mt-2">{error}</div>}
      {success && <div className="text-green-600 mt-2">{success}</div>}
    </div>
  );
}
