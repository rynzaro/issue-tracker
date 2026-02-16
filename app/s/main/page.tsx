import Card from "@/components/card";
import { getWorkspaces } from "@/lib/util";
import { Workspace } from "@/lib/types";
import Link from "next/link";

export default async function Home() {
  const workspacesRes = await getWorkspaces();
  if (!workspacesRes.ok) {
    return (
      <div className="text-red-600 font-semibold">
        Failed to load workspaces
      </div>
    );
  }
  const workspaces: Workspace[] = await workspacesRes.json();

  console.log(workspaces);

  return (
    <div className="flex flex-col gap-6">
      {workspaces.map((workspace: Workspace) => (
        <Link href={`/main/${workspace.id}`} key={workspace.id}>
          <Card
            key={workspace.id}
            className="border border-gray-200 hover:bg-gray-50 hover:cursor-pointer"
          >
            <div className="font-semibold">{workspace.name}</div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
