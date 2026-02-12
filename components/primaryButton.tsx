import clsx from "clsx";

export default function PrimaryButton({
  fullWidth,
  onClick,
  children,
  className,
}: {
  fullWidth?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 hover:cursor-pointer",
        fullWidth && "w-full",
        className,
      )}
    >
      {children}
    </button>
  );
}
