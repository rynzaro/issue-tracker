import Card from "@/components/card";
import { getWorkspaces } from "@/lib/util";
import { Workspace } from "@/lib/types";
import Link from "next/link";
import { ErrorText, Text } from "@/components/text";
import { Heading, Subheading } from "@/components/heading";

export default async function Home() {
  // const workspacesRes = await getWorkspaces();
  // if (!workspacesRes.ok) {
  //   return <ErrorText>Failed to load workspaces</ErrorText>;
  // }
  // const workspaces: Workspace[] = await workspacesRes.json();

  return (
    <>
      <Heading level={1}>Welcome to the Issue Tracker</Heading>
      <Subheading level={1}>Welcome to the Issue Tracker</Subheading>
      <Subheading level={2}>Welcome to the Issue Tracker</Subheading>
      <Subheading level={3}>Welcome to the Issue Tracker</Subheading>
      <Subheading level={4}>Welcome to the Issue Tracker</Subheading>
      <Subheading level={5}>Welcome to the Issue Tracker</Subheading>
      <Subheading level={6}>Welcome to the Issue Tracker</Subheading>
      <Text>Irgendein Text </Text>
      {/* {workspaces.map((workspace: Workspace) => (
        <Link href={`/main/${workspace.id}`} key={workspace.id}>
          <Card
            key={workspace.id}
            className="border border-gray-200 hover:bg-gray-50 hover:cursor-pointer"
          >
            <div className="font-semibold">{workspace.name}</div>
          </Card>
        </Link>
      ))} */}
    </>
  );
}
