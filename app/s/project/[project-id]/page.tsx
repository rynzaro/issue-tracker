import { Text } from "@/components/text";

export default async function Page({
  params,
}: {
  params: Promise<{ [key: string]: string }>;
}) {
  const { "project-id": projectId } = await params;

  return <Text>Project: {projectId}</Text>;
}
