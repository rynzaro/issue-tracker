import clsx from "clsx";

type HeadingProps = {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
} & React.ComponentPropsWithoutRef<"h1" | "h2" | "h3" | "h4" | "h5" | "h6">;

export function Heading({ className, level = 1, ...props }: HeadingProps) {
  let Element: `h${typeof level}` = `h${level}`;

  return (
    <Element
      {...props}
      className={clsx(
        className,
        "text-2xl font-semibold text-zinc-950 sm:text-3xl dark:text-white",
      )}
    />
  );
}

export function Subheading({ className, level = 2, ...props }: HeadingProps) {
  let Element: `h${typeof level}` = `h${level}`;

  const sizeClasses = {
    1: "text-2xl/8 sm:text-3xl/9 font-semibold",
    2: "text-xl/8 sm:text-2xl/9 font-semibold",
    3: "text-lg/8 sm:text-xl/8 font-semibold",
    4: "text-base/7 sm:text-lg/8 font-semibold",
    5: "text-sm/6 sm:text-base/7 font-semibold",
    6: "text-sm/6 sm:text-base/6 font-semibold",
  };

  return (
    <Element
      {...props}
      className={clsx(
        sizeClasses[level as keyof typeof sizeClasses] || sizeClasses[2],
        className,
      )}
    />
  );
}
