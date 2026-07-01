import { Heading } from "./heading";
import { Divider } from "./divider";
import { SecondaryText } from "./text";
import clsx from "clsx";

export default function PrimaryHeader({
  title,
  info,
  noMargin = false,
}: {
  title: string;
  info?: string;
  noMargin?: boolean;
}) {
  return (
    <div className={clsx(noMargin ? "" : "mb-8")}>
      <Heading>{title}</Heading>
      <Divider className="my-2" />
      {info && <SecondaryText>{info}</SecondaryText>}
    </div>
  );
}
