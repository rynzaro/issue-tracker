"use server";

import { auth } from "@/auth";
import {
  createServiceErrorResponse,
  validateInput,
} from "@/lib/services/serviceUtil";
import {
  addTaskMember,
  removeTaskMember,
} from "@/lib/services/taskMember.service";
import { TaskMemberSchema } from "@/lib/schema/task";
import { revalidatePath } from "next/cache";

export async function addTaskMemberAction({
  taskId,
  memberUserId,
}: {
  taskId: string;
  memberUserId: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return createServiceErrorResponse("AUTHORIZATION_ERROR", "Unauthorized user");
  }

  const validated = validateInput(TaskMemberSchema, { taskId, memberUserId });
  if (!validated.success) return validated;

  const result = await addTaskMember({
    taskId: validated.data.taskId,
    memberUserId: validated.data.memberUserId,
    ownerUserId: session.user.id,
  });

  if (result.success) revalidatePath("/s/project", "layout");
  return result;
}

export async function removeTaskMemberAction({
  taskId,
  memberUserId,
}: {
  taskId: string;
  memberUserId: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return createServiceErrorResponse("AUTHORIZATION_ERROR", "Unauthorized user");
  }

  const validated = validateInput(TaskMemberSchema, { taskId, memberUserId });
  if (!validated.success) return validated;

  const result = await removeTaskMember({
    taskId: validated.data.taskId,
    memberUserId: validated.data.memberUserId,
    ownerUserId: session.user.id,
  });

  if (result.success) revalidatePath("/s/project", "layout");
  return result;
}
