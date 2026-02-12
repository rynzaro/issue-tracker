import { ReactNode } from "react";

export default function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-lg bg-white shadow-sm ${className}`}
    >
      <div className="px-4 py-5 sm:p-6">{children}</div>
    </div>
  );
}
