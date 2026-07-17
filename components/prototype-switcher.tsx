"use client";

// PROTOTYPE — throwaway. Delete with the prototype route it serves.

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect } from "react";

export function PrototypeSwitcher({
  variants,
  current,
  caption,
}: {
  variants: { key: string; name: string }[];
  current: string;
  caption?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const index = Math.max(
    0,
    variants.findIndex((v) => v.key === current),
  );

  function go(delta: number) {
    const next = variants[(index + delta + variants.length) % variants.length];
    const params = new URLSearchParams(searchParams.toString());
    params.set("variant", next.key);
    router.replace(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
      {caption && (
        <p className="max-w-xl rounded-md bg-amber-100 px-3 py-1.5 text-center text-xs text-amber-900 shadow-lg dark:bg-amber-900 dark:text-amber-100">
          {caption}
        </p>
      )}
      <div className="flex items-center gap-1 rounded-full bg-zinc-900 px-2 py-1.5 text-white shadow-xl ring-2 ring-amber-400 dark:bg-white dark:text-zinc-900">
        <button
          type="button"
          onClick={() => go(-1)}
          className="px-3 py-1 text-lg leading-none hover:opacity-60"
          aria-label="Vorherige Variante"
        >
          ←
        </button>
        <span className="min-w-64 select-none px-2 text-center font-mono text-sm">
          {variants[index].key} — {variants[index].name}
        </span>
        <button
          type="button"
          onClick={() => go(1)}
          className="px-3 py-1 text-lg leading-none hover:opacity-60"
          aria-label="Nächste Variante"
        >
          →
        </button>
      </div>
    </div>
  );
}
