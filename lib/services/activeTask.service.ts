import client from "../prisma";
import { serviceQuery } from "./serviceUtil";

export function getActiveTimeEntryForUser({ userId }: { userId: string }) {
  return serviceQuery(
    () =>
      client.activeTimer.findUnique({
        where: { userId },
      }),
    "Failed to fetch active time entry",
  );
}
