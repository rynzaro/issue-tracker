import clsx from "clsx";
import { ReactNode } from "react";

export default function IconButton({
  onClick,
  children,
  borderless = false,
  invertedColors = false,
  disabled = false,
  size = "md",
}: {
  onClick?: () => void;
  children: ReactNode;
  borderless?: boolean;
  invertedColors?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
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
        "rounded flex items-center justify-center",
        size === "sm" && "w-8 h-8",
        size === "md" && "w-10 h-10",
        size === "lg" && "w-12 h-12",
        !borderless && "border border-gray-300 dark:border-zinc-700",
        invertedColors
          ? "bg-zinc-800 text-white dark:bg-white dark:text-zinc-800 hover:bg-zinc-700 dark:hover:bg-gray-200"
          : "hover:bg-gray-300 dark:hover:bg-zinc-700",
        disabled && "opacity-25  bg-gray-300 dark:bg-zinc-700",
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
