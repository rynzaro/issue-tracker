import clsx from "clsx";
import { ReactNode } from "react";

export default function TaskRowButton({
  onClick,
  borderless = false,
  children,
}: {
  onClick?: () => void;
  borderless?: boolean;
  children: ReactNode;
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
        "w-10 h-10 rounded hover:bg-gray-300 dark:hover:bg-zinc-700 flex items-center justify-center",
        !borderless && "border border-gray-300 dark:border-zinc-700",
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {children}
    </button>
  );
}
