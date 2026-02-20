"use client";

import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { createTaskAction } from "@/lib/actions/task.actions";
import { CreateTaskParams } from "@/lib/schema/task";
import { useState } from "react";

export default function NewRootTask({ projectId }: { projectId: string }) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  async function handleAddTask() {
    if (!newTaskTitle.trim()) return;
    const body: CreateTaskParams = {
      title: newTaskTitle,
      description: "",
      parentId: null,
      projectId,
    };
    const task = await createTaskAction({ createTaskParams: body });
    if (task.success) {
      setNewTaskTitle("");
    } else {
      //TODO error handling
    }
  }
  return (
    <div className="flex gap-2">
      <Input
        type="text"
        value={newTaskTitle}
        onChange={(e) => setNewTaskTitle(e.target.value)}
      />
      <Button className="shrink-0" onClick={handleAddTask}>
        Aufgabe Hinzufügen
      </Button>
    </div>
  );
}
