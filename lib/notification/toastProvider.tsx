"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
  type ReactElement,
} from "react";
import { Transition } from "@headlessui/react";
import {
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { XMarkIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";

type ToastType = "success" | "error" | "info";

type ToastData = {
  id: string;
  type: ToastType;
  content: ReactNode;
  duration?: number;
  show: boolean;
};

type ToastContextType = {
  showToast: (content: ReactNode, options?: { duration?: number }) => void;
};

const iconColorMap: Record<ToastType, string> = {
  success: "text-green-400",
  error: "text-red-400",
  info: "text-blue-400",
};

function getToastType(content: ReactNode): ToastType {
  if (typeof content === "object" && content !== null && "type" in content) {
    const element = content as ReactElement;
    if (element.type === SuccessToast) return "success";
    if (element.type === ErrorToast) return "error";
    if (element.type === InfoToast) return "info";
  }
  return "info";
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const removeToast = useCallback((id: string) => {
    // Step 1: trigger exit animation
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, show: false } : t)),
    );
    // Step 2: remove from DOM after animation completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 200);
  }, []);

  const showToast = useCallback(
    (content: ReactNode, options?: { duration?: number }) => {
      const id = Math.random().toString(36).slice(2, 9);
      const type = getToastType(content);
      const duration = options?.duration ?? 5000;
      console.log("Showing toast:", { id, type, content, duration });
      setToasts((prev) => [
        ...prev,
        { id, type, content, duration, show: true },
      ]);

      if (duration !== Infinity) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div
        aria-live="assertive"
        className="pointer-events-none fixed inset-0 z-50 flex items-start justify-end px-4 py-6 sm:p-6"
      >
        <div className="flex w-full max-w-sm flex-col items-end space-y-3">
          {toasts.map((toast) => {
            return (
              <Transition key={toast.id} show={toast.show}>
                <div
                  className={clsx(
                    "pointer-events-auto w-full rounded-lg border-l-4 bg-white shadow-lg outline-1 outline-gray-300 transition data-closed:opacity-0 data-enter:transform data-enter:duration-300 data-enter:ease-out data-closed:data-enter:translate-y-2 data-closed:data-enter:sm:translate-x-2 data-closed:data-enter:sm:translate-y-0 data-leave:duration-100 data-leave:ease-in",
                    toast.type === "success" && "border-green-400",
                    toast.type === "error" && "border-red-400",
                    toast.type === "info" && "border-blue-400",
                    !toast.type && "border-gray-300  dark:border-zinc-600",
                  )}
                >
                  <div className="p-4">
                    <div className="flex items-start">
                      <div className="shrink-0">
                        {toast.type === "success" && (
                          <CheckCircleIcon
                            aria-hidden="true"
                            className="w-6 h-6 text-green-400"
                          />
                        )}
                        {toast.type === "error" && (
                          <XCircleIcon
                            aria-hidden="true"
                            className="w-6 h-6 text-red-400"
                          />
                        )}
                        {toast.type === "info" && (
                          <InformationCircleIcon
                            aria-hidden="true"
                            className="w-6 h-6 text-blue-400"
                          />
                        )}
                      </div>

                      <div className="ml-3 w-0 flex-1 pt-0.5">
                        {toast.content}
                      </div>

                      <div className="ml-4 flex shrink-0">
                        <button
                          type="button"
                          onClick={() => removeToast(toast.id)}
                          className="inline-flex rounded-md text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600 dark:text-white dark:hover:text-zinc-300 dark:focus:outline-indigo-500"
                        >
                          <XMarkIcon aria-hidden="true" className="size-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>
            );
          })}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}

type ToastContentProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

export function SuccessToast({
  title,
  description,
  children,
}: ToastContentProps) {
  return (
    <>
      <p className="text-sm font-medium text-gray-900 dark:text-white">
        {title}
      </p>
      {description && (
        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
          {description}
        </p>
      )}
      {children}
    </>
  );
}

export function ErrorToast({
  title,
  description,
  children,
}: ToastContentProps) {
  return (
    <>
      <p className="text-sm font-medium text-gray-900 dark:text-white">
        {title}
      </p>
      {description && (
        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
          {description}
        </p>
      )}
      {children}
    </>
  );
}

export function InfoToast({ title, description, children }: ToastContentProps) {
  return (
    <>
      <p className="text-sm font-medium text-gray-900 dark:text-white">
        {title}
      </p>
      {description && (
        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
          {description}
        </p>
      )}
      {children}
    </>
  );
}
