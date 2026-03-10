"use client";

import clsx from "clsx";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type TooltipPosition = "top" | "bottom" | "left" | "right";

const MAX_WIDTH_MAP = {
  xs: 320,
  sm: 384,
  md: 448,
  lg: 512,
  none: undefined,
} as const;

interface TooltipProps {
  content: React.ReactNode;
  position?: TooltipPosition;
  children: React.ReactNode;
  disabled?: boolean;
  delayMs?: number;
  maxWidth?: keyof typeof MAX_WIDTH_MAP;
}

export function Tooltip({
  content,
  position = "top",
  children,
  disabled = false,
  delayMs = 200,
  maxWidth = "sm",
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [actualPosition, setActualPosition] = useState(position);
  const [tightWidth, setTightWidth] = useState<number | undefined>(undefined);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (autoHideTimeoutRef.current) {
      clearTimeout(autoHideTimeoutRef.current);
      autoHideTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimeouts();
  }, [clearTimeouts]);

  const resolvedMaxWidth = MAX_WIDTH_MAP[maxWidth];

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    // --- Tight-fit width: shrink box to longest wrapped line ---
    let finalWidth: number | undefined;
    const mw = resolvedMaxWidth;
    if (mw != null) {
      // Measure height at maxWidth (establishes the line count)
      tooltip.style.width = `${mw}px`;
      tooltip.style.maxWidth = `${mw}px`;
      const targetHeight = tooltip.offsetHeight;

      // Binary search for the smallest width that keeps the same height
      let lo = 50;
      let hi: number = mw;
      while (hi - lo > 1) {
        const mid = Math.floor((lo + hi) / 2);
        tooltip.style.width = `${mid}px`;
        tooltip.style.maxWidth = `${mid}px`;
        if (tooltip.offsetHeight <= targetHeight) {
          hi = mid;
        } else {
          lo = mid;
        }
      }
      finalWidth = hi;
      tooltip.style.width = `${hi}px`;
      tooltip.style.maxWidth = `${hi}px`;
    }

    // --- Position calculation (uses tooltip at its final width) ---
    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const gap = 8;
    const edgePadding = 8;

    let pos = position;

    // Flip if not enough space in preferred direction
    if (pos === "top" && triggerRect.top - tooltipRect.height - gap < 0) {
      pos = "bottom";
    } else if (
      pos === "bottom" &&
      triggerRect.bottom + tooltipRect.height + gap > viewportH
    ) {
      pos = "top";
    } else if (
      pos === "left" &&
      triggerRect.left - tooltipRect.width - gap < 0
    ) {
      pos = "right";
    } else if (
      pos === "right" &&
      triggerRect.right + tooltipRect.width + gap > viewportW
    ) {
      pos = "left";
    }

    let top: number;
    let left: number;

    switch (pos) {
      case "top":
        top = triggerRect.top - tooltipRect.height - gap;
        left =
          triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      case "bottom":
        top = triggerRect.bottom + gap;
        left =
          triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      case "left":
        top =
          triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.left - tooltipRect.width - gap;
        break;
      case "right":
        top =
          triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.right + gap;
        break;
    }

    // Clamp horizontal to stay within viewport
    left = Math.max(
      edgePadding,
      Math.min(left, viewportW - tooltipRect.width - edgePadding),
    );
    // Clamp vertical
    top = Math.max(
      edgePadding,
      Math.min(top, viewportH - tooltipRect.height - edgePadding),
    );

    setCoords({ top, left });
    setActualPosition(pos);
    setTightWidth(finalWidth);
  }, [position, resolvedMaxWidth]);

  // Recalculate position when tooltip mounts/updates
  useLayoutEffect(() => {
    if (isMounted) {
      updatePosition();
    }
  }, [isMounted, updatePosition]);

  const show = useCallback(() => {
    setIsOpen(true);
    setIsMounted(true);
  }, []);

  const hide = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => setIsMounted(false), 150);
  }, []);

  const handleMouseEnter = () => {
    if (disabled) return;
    clearTimeouts();
    timeoutRef.current = setTimeout(show, delayMs);
  };

  const handleMouseLeave = () => {
    if (disabled) return;
    clearTimeouts();
    hide();
  };

  const handleTouchStart = () => {
    if (disabled) return;
    clearTimeouts();
    show();

    autoHideTimeoutRef.current = setTimeout(hide, 2000);
  };

  const handleFocus = () => {
    if (disabled) return;
    show();
  };

  const handleBlur = () => {
    if (disabled) return;
    clearTimeouts();
    hide();
  };

  const arrowClasses: Record<TooltipPosition, string> = {
    top: "bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-l-transparent border-r-transparent border-b-transparent border-t-zinc-900 dark:border-t-zinc-700",
    bottom:
      "top-0 left-1/2 -translate-x-1/2 -translate-y-full border-l-transparent border-r-transparent border-t-transparent border-b-zinc-900 dark:border-b-zinc-700",
    left: "right-0 top-1/2 -translate-y-1/2 translate-x-full border-t-transparent border-b-transparent border-r-transparent border-l-zinc-900 dark:border-l-zinc-700",
    right:
      "left-0 top-1/2 -translate-y-1/2 -translate-x-full border-t-transparent border-b-transparent border-l-transparent border-r-zinc-900 dark:border-r-zinc-700",
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-describedby={isOpen ? "tooltip" : undefined}
        className="inline-flex"
      >
        {children}
      </div>
      {isMounted &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            id="tooltip"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              zIndex: 9999,
              pointerEvents: "none",
              ...(tightWidth != null
                ? { width: tightWidth, maxWidth: tightWidth }
                : {}),
            }}
            className={clsx(
              "rounded-lg px-3 py-2",
              "text-xs font-medium text-white",
              "bg-zinc-900/90 backdrop-blur-sm",
              "dark:bg-zinc-700/90",
              "shadow-lg ring-1 ring-zinc-950/10 dark:ring-white/10",
              "w-max text-balance",
              "transition-opacity duration-150",
              isOpen ? "opacity-100" : "opacity-0",
            )}
          >
            {content}
            {/* Arrow */}
            <div
              className={clsx(
                "absolute w-0 h-0 border-4",
                arrowClasses[actualPosition],
              )}
            />
          </div>,
          document.body,
        )}
    </>
  );
}

// Export types for consumers
export type { TooltipPosition };
export type TooltipMaxWidth = keyof typeof MAX_WIDTH_MAP;
