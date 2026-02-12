import TaskManager from "@/app/main/[workspaceId]/taskManager";
import { getAllTags, getWorkspace, getWorkspaces } from "@/util/lib";
import { unstable_cache } from "next/cache";

export type Tag = {
  id: number;
  name: string;
  workspace_id: number;
};

type Props = {
  workspaceId: string;
};

const getCachedTags = unstable_cache(
  async () => {
    console.log("REFETCHED TAGS");
    const tagsRes = await getAllTags();
    if (!tagsRes.ok) throw new Error("Failed to fetch tags");
    return await tagsRes.json();
  },
  ["tags"],
  { revalidate: 120 }, // 2 minutes
);

export default async function Page({ params }: { params: Promise<Props> }) {
  const { workspaceId } = await params;

  const tags: Tag[] = await getCachedTags();
  const filteredTags = tags.filter(
    (tag: any) =>
      tag.workspace_id === Number(workspaceId) && tag.name.startsWith("T:"),
  );

  return (
    <div className="mt-16 mx-10%">
      <TaskManager tags={filteredTags} workspaceId={Number(workspaceId)} />
    </div>
  );
}
