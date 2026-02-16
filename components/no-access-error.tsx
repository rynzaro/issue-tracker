import { ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { Badge } from "./badge";
import { Button } from "./button";
import { Divider } from "./divider";
import { Text } from "./text";

export default function NoAccessError({
  subject = "Zugriff verweigert",
  description = "Du hast keine Berechtigung, auf diese Seite zuzugreifen.",
}: {
  subject?: string;
  description?: string;
}) {
  return (
    <div className="flex h-[80vh] items-center justify-center px-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        {/* Icon with subtle background */}
        <div className="flex items-center justify-center rounded-full bg-red-50 p-4 dark:bg-red-500/10">
          <ShieldExclamationIcon className="h-12 w-12 stroke-[1.5] text-red-600 dark:text-red-400" />
        </div>

        <Badge color="red">403</Badge>

        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-white">
          {subject}
        </h1>

        <Text className="max-w-sm">{description}</Text>

        <Button href="/login" color="indigo" className="mt-2">
          Zur Startseite
        </Button>

        {/* // TODO implement support page */}
        {/* Support hint */}
        {/* <Divider soft className="mt-2" /> */}
        {/* <Text className="text-xs">
          Falls du glaubst, dass hier ein Fehler vorliegt, wende dich gerne an
          unseren{" "}
          <a
            className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            href="/s/support"
          >
            Support &rarr;
          </a>
        </Text> */}
      </div>
    </div>
  );
}
