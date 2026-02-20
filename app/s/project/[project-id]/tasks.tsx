"use client";

import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { createTaskAction } from "@/lib/actions/task.actions";
import { CreateTaskParams } from "@/lib/schema/task";
import { Task } from "@prisma/client";
import { useState } from "react";

export default function Tasks({
  projectId,
  tasks,
}: {
  projectId: string;
  tasks: Task[];
}) {
  const [localTasks, setLocalTasks] = useState(tasks);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newSubTaskTitle, setNewSubTaskTitle] = useState("");

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
      setLocalTasks([...localTasks, task.data]);
      setNewTaskTitle("");
    } else {
      //TODO error handling
    }
  }
  return (
    <div className="flex flex-col gap-2">
      {localTasks.map((task) => (
        <div key={task.id} className="flex gap-2 justify-between">
          <h3>{task.title}</h3>
          {task.description && <p>{task.description}</p>}
          <div className="flex gap-2">
            <Button className="shrink-0">Unteraufgabe Hinzufügen</Button>
          </div>
        </div>
      ))}
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
    </div>
  );
}
