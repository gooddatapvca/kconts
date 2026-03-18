"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; desc?: string };

const NAV: NavItem[] = [
  { href: "/admin/twitter-manual", label: "트위터 수동수집대상", desc: "xxx_pjlist1" },
  { href: "/admin/multi-broadcast", label: "다중 방송국 등록", desc: "grp_pclass" },
  { href: "/admin/multi-weekday", label: "프로그램 다중 요일", desc: "project.service_day" },
  { href: "/admin/dcgallery", label: "DC갤러리-프로그램", desc: "dcgallery" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-dvh w-72 flex-col border-r border-zinc-800 bg-zinc-900/95 px-4 py-4">
      <div className="px-2 pb-4">
        <div className="text-sm font-semibold text-zinc-100">관리툴</div>
        <div className="text-xs text-zinc-400">2026 운영 페이지</div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map((it) => {
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={[
                "rounded-lg px-3 py-2 border transition-colors",
                active
                  ? "bg-indigo-500/90 border-indigo-400/80 text-white shadow-sm"
                  : "border-transparent text-zinc-300 hover:bg-zinc-800/80 hover:text-zinc-50",
              ].join(" ")}
            >
              <div className="text-sm font-medium">{it.label}</div>
              {it.desc ? (
                <div className="text-xs text-zinc-500">{it.desc}</div>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-2 pt-4 text-xs text-zinc-500">
        DB 연결은 <code className="text-zinc-300">DATABASE_URL</code> 사용
      </div>
    </aside>
  );
}

