import clsx from "clsx";
import { ReactNode } from "react";

export default function TaskRowButton({
  onClick,
  children,
  borderless = false,
  invertedColors = false,
}: {
  onClick?: () => void;
  children: ReactNode;
  borderless?: boolean;
  invertedColors?: boolean;
}) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onClick?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.stopPropagation();
      onClick?.();
    }
  };
  return (
    <button
      className={clsx(
        "w-10 h-10 rounded flex items-center justify-center",
        !borderless && "border border-gray-300 dark:border-zinc-700",
        invertedColors
          ? "bg-zinc-800 text-white dark:bg-white dark:text-zinc-800 hover:bg-zinc-700 dark:hover:bg-gray-200"
          : "hover:bg-gray-300 dark:hover:bg-zinc-700",
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {children}
    </button>
  );
}
