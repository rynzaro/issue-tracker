import { FaceFrownIcon } from "@heroicons/react/24/outline";
import { Badge } from "./badge";
import { Button } from "./button";
import { Divider } from "./divider";
import { SecondaryText } from "./text";

export default function NotFoundError({
  subject = "Seite nicht gefunden",
  description = "Die angeforderte Seite existiert nicht oder wurde verschoben.",
}: {
  subject?: string;
  description?: string;
}) {
  return (
    <div className="flex h-[80vh] items-center justify-center px-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        {/* Icon with subtle background */}
        <div className="flex items-center justify-center rounded-full bg-indigo-50 p-4 dark:bg-indigo-500/10">
          <FaceFrownIcon className="h-12 w-12 stroke-[1.5] text-indigo-600 dark:text-indigo-400" />
        </div>

        {/* Error code badge */}
        <Badge color="indigo">404</Badge>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-white">
          {subject}
        </h1>

        {/* Description */}
        <SecondaryText className="max-w-sm">{description}</SecondaryText>

        {/* CTA */}
        <Button href="/s/main" color="indigo" className="mt-2">
          Zur Startseite
        </Button>

        {/* Support hint */}
        <Divider soft className="mt-2" />
        <SecondaryText className="text-xs">
          Falls du glaubst, dass hier ein Fehler vorliegt, wende dich gerne an
          unseren{" "}
          <a
            className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            href="/s/support"
          >
            Support &rarr;
          </a>
        </SecondaryText>
      </div>
    </div>
  );
}
