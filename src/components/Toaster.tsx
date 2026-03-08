"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type ToastKind = "success" | "error" | "info";

export type Toast = {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
  createdAt: number;
};

type ToastApi = {
  push: (t: Omit<Toast, "id" | "createdAt">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

function kindStyle(kind: ToastKind) {
  if (kind === "success") return "border-emerald-400/20 bg-emerald-950/40";
  if (kind === "error") return "border-rose-400/20 bg-rose-950/40";
  return "border-sky-400/20 bg-sky-950/40";
}

function kindDot(kind: ToastKind) {
  if (kind === "success") return "bg-emerald-400";
  if (kind === "error") return "bg-rose-400";
  return "bg-sky-400";
}

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id" | "createdAt">) => {
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const toast: Toast = { id, createdAt: Date.now(), ...t };
    setItems((prev) => [toast, ...prev].slice(0, 5));

    window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, 3500);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (title, description) => push({ kind: "success", title, description }),
      error: (title, description) => push({ kind: "error", title, description }),
      info: (title, description) => push({ kind: "info", title, description }),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[360px] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={[
              "pointer-events-auto rounded-xl border p-3 shadow-2xl backdrop-blur",
              kindStyle(t.kind),
            ].join(" ")}
          >
            <div className="flex items-start gap-2">
              <div className={["mt-1.5 h-2 w-2 rounded-full", kindDot(t.kind)].join(" ")} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-zinc-50">{t.title}</div>
                {t.description ? (
                  <div className="mt-0.5 line-clamp-2 text-xs text-zinc-300">
                    {t.description}
                  </div>
                ) : null}
              </div>
              <button
                onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
                className="rounded-md px-2 py-1 text-xs text-zinc-300 hover:bg-white/5"
                aria-label="close"
              >
                닫기
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToasterProvider");
  return ctx;
}

