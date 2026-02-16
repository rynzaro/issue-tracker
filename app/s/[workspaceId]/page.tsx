import { getActiveEntries, getAllTags } from "@/lib/util";
import { ActiveEntry, Tag } from "@/lib/types";
import { unstable_cache } from "next/cache";
import TaskManager from "./taskManager";

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
  { revalidate: 120 },
);

export default async function Page({ params }: { params: Promise<Props> }) {
  const { workspaceId } = await params;

  const tags: Tag[] = await getCachedTags();

  const activeEntriesRes = await getActiveEntries();
  if (!activeEntriesRes.ok)
    return (
      <div className="text-red-600 font-semibold">
        Failed to fetch active time entries
      </div>
    );
  const activeEntry: ActiveEntry = await activeEntriesRes.json();

  const filteredTags = tags
    .filter(
      (tag: any) =>
        tag.workspace_id === Number(workspaceId) && tag.name.startsWith("T:"),
    )
    .map((tag) => ({
      ...tag,
      active: activeEntry?.tag_ids.includes(tag.id) || false,
    }));

  return <TaskManager tags={filteredTags} workspaceId={Number(workspaceId)} />;
}
