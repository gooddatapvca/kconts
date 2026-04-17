"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; desc?: string };

const NAV: NavItem[] = [
  { href: "/admin/twitter-manual", label: "트위터 수동수집대상", desc: "xxx_pjlist1" },
  { href: "/admin/multi-broadcast", label: "다중 방송국 등록", desc: "grp_pclass" },
  { href: "/admin/multi-weekday", label: "프로그램 다중 요일", desc: "project.service_day" },
  { href: "/admin/dcgallery", label: "DC갤러리-프로그램", desc: "dcgallery" },
  { href: "/admin/deleted-topics", label: "삭제토픽 관리", desc: "topic · 미사용 복구" },
  { href: "/admin/filtering", label: "필터링 관리", desc: "raw_contents · 삭제/복구" },
];

type SidebarProps = {
  onRequestCollapse?: () => void;
};

export function Sidebar({ onRequestCollapse }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-dvh w-72 flex-col bg-zinc-900/95 px-4 py-4">
      <div className="flex items-start justify-between gap-2 px-2 pb-4">
        <div>
          <div className="text-sm font-semibold text-zinc-100">관리툴</div>
          <div className="text-xs text-zinc-400">2026 운영 페이지</div>
        </div>
        {onRequestCollapse ? (
          <button
            type="button"
            onClick={onRequestCollapse}
            className="shrink-0 rounded-md border border-zinc-600 bg-zinc-800/80 px-2 py-1 text-[11px] font-medium text-zinc-300 hover:bg-zinc-700 hover:text-zinc-50"
            aria-label="메뉴 숨기기"
          >
            숨기기
          </button>
        ) : null}
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

