"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";

export function AdminShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-dvh">
      <div
        className={[
          "shrink-0 overflow-hidden border-r border-zinc-800 transition-[width] duration-200 ease-out",
          collapsed ? "w-0 border-0" : "w-72",
        ].join(" ")}
      >
        <Sidebar onRequestCollapse={() => setCollapsed(true)} />
      </div>
      {collapsed ? (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="fixed left-0 top-24 z-50 rounded-r-lg border border-l-0 border-zinc-700 bg-zinc-900/95 px-2.5 py-3 text-left text-xs font-medium leading-tight text-zinc-200 shadow-lg backdrop-blur-sm hover:bg-zinc-800"
          aria-expanded={false}
          aria-label="메뉴 펼치기"
        >
          메뉴
          <br />
          펼치기
        </button>
      ) : null}
      <main className="min-h-dvh min-w-0 flex-1 bg-zinc-950 p-6 text-zinc-100">{children}</main>
    </div>
  );
}
