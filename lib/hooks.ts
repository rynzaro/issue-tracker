import { useEffect, useRef, useState } from "react";
import { FormState, handleInput as _handleInput } from "./formUtils";
import { CreateTaskParams, TaskNode, UpdateTaskParams } from "./schema/task";
import { createTaskAction, updateTaskAction } from "./actions/task.actions";
import { useRouter } from "next/navigation";

/**
 * Returns elapsed seconds since `startedAt`, updating every second.
 * Returns 0 when startedAt is null (no active timer).
 */
export function useElapsedTimer(startedAt: Date | null): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) {
      setElapsed(0);
      return;
    }

    const start = new Date(startedAt).getTime();
    setElapsed(Math.floor((Date.now() - start) / 1000));

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1_000);

    return () => clearInterval(interval);
  }, [startedAt]);

  return elapsed;
}

/**
 * Returns the last non-null/non-undefined value passed.
 * Useful for keeping display data visible during exit animations
 * (e.g. a dialog that shows task.title while closing).
 */
export function usePersistentValue<T>(value: T | null | undefined): T | null {
  const ref = useRef<T | null>(null);
  if (value != null) ref.current = value;
  return ref.current;
}

export type TaskFormValues = {
  title: string;
  estimatedDuration: string;
  description: string;
};

const initialFormState: FormState<TaskFormValues> = {
  title: { value: "", required: true, touched: false },
  estimatedDuration: { value: "", required: false, touched: false },
  description: { value: "", required: false, touched: false },
};

/**
 * Encapsulates form state, prefill, reset, and task creation submission.
 * The component owns dialog open/close state; this hook owns data and async logic.
 */
export function useTaskForm(projectId: string) {
  const [values, setValues] =
    useState<FormState<TaskFormValues>>(initialFormState);
  const router = useRouter();

  function resetForm() {
    setValues(initialFormState);
  }

  function prefillForm(task: TaskNode) {
    setValues((prev) => ({
      ...prev,
      title: { ...prev.title, value: task.title ?? "" },
      estimatedDuration: {
        ...prev.estimatedDuration,
        value: task.estimate ? String(task.estimate) : "",
      },
      description: { ...prev.description, value: task.description ?? "" },
    }));
  }

  function validateForm(): boolean {
    const errors: Partial<Record<keyof TaskFormValues, string>> = {};

    if (!values.title.value || values.title.value.trim().length < 2) {
      errors.title = "Titel muss mindestens 2 Zeichen lang sein";
    }
    if (values.description.value && values.description.value.length > 1000) {
      errors.description = "Beschreibung darf maximal 1000 Zeichen lang sein";
    }

    const hasErrors = Object.keys(errors).length > 0;
    if (hasErrors) {
      setValues((prev) => {
        const next = { ...prev };
        for (const key in next) {
          const k = key as keyof TaskFormValues;
          next[k] = { ...next[k], error: errors[k] ?? null };
        }
        return next;
      });
    }
    return !hasErrors;
  }

  async function submitCreate(parentId: string | null) {
    if (!validateForm()) {
      return {
        success: false as const,
        error: "VALIDATION_ERROR" as const,
        message: "Eingabe ungültig",
      };
    }
    const body: CreateTaskParams = {
      title: values.title.value,
      projectId,
      description: values.description.value,
      estimate: values.estimatedDuration.value
        ? parseInt(values.estimatedDuration.value) || undefined
        : undefined,
      parentId,
    };
    const result = await createTaskAction({ createTaskParams: body });
    if (result.success) {
      resetForm();
      router.refresh();
    }
    return result;
  }

  async function submitUpdate(taskId: string) {
    if (!validateForm()) {
      return {
        success: false as const,
        error: "VALIDATION_ERROR" as const,
        message: "Eingabe ungültig",
      };
    }
    const body: UpdateTaskParams = {
      id: taskId,
      title: values.title.value,
      description: values.description.value,
      estimate: values.estimatedDuration.value
        ? parseInt(values.estimatedDuration.value) || undefined
        : undefined,
      tagIds: null, // null = don't modify tags (handled separately)
    };
    const result = await updateTaskAction({ updateTaskParams: body });
    if (result.success) {
      resetForm();
      router.refresh();
    }
    return result;
  }

  return {
    values,
    setValues,
    resetForm,
    prefillForm,
    submitCreate,
    submitUpdate,
  };
}
