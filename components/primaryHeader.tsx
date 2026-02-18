import { Heading } from "./heading";
import { Divider } from "./divider";
import { Text } from "./text";

export default function PrimaryHeader({
  title,
  info,
}: {
  title: string;
  info?: string;
}) {
  return (
    <div className="pb-8">
      <Heading>{title}</Heading>
      <Divider className="my-2" />
      <Text>{info}</Text>
    </div>
  );
}
