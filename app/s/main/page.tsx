import { PrimaryText, SecondaryText } from "@/components/text";
import { Heading, Subheading } from "@/components/heading";

export default async function Home() {
  // const workspacesRes = await getWorkspaces();
  // if (!workspacesRes.ok) {
  //   return <ErrorText>Failed to load workspaces</ErrorText>;
  // }
  // const workspaces: Workspace[] = await workspacesRes.json();

  return (
    <>
      <Heading level={1}>Page Heading</Heading>
      <Subheading level={1}>Subheading 1</Subheading>
      <Subheading level={2}>Subheading 2</Subheading>
      <Subheading level={3}>Subheading 3</Subheading>
      <Subheading level={4}>Subheading 4</Subheading>
      <Subheading level={5}>Subheading 5</Subheading>
      <Subheading level={6}>Subheading 6</Subheading>
      <PrimaryText>Das ist ein Primary Text</PrimaryText>
      <SecondaryText>Das ist ein Secondary Text</SecondaryText>
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
