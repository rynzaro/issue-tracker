import { Heading } from "./heading";
import { Divider } from "./divider";
import { SecondaryText } from "./text";

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
      <SecondaryText>{info}</SecondaryText>
    </div>
  );
}
