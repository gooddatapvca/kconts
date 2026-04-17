"use client";

import { useCallback, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/Toaster";
import { fetchJson } from "@/lib/fetchJson";
import { errorMessage } from "@/lib/errors";
import { WEEKDAYS } from "@/lib/parsers";

type ProgramRow = { pj_seq: string; pjname: string; doc_count: number };

type ContentRow = {
  conts_seq: number;
  pj_seq: number;
  site_id: string | null;
  site_name: string | null;
  title: string | null;
  writer: string | null;
  wdate: string | null;
  cwdate: string | null;
  conts_status: number | null;
  rp_count: number | null;
  v_count: number | null;
  origin_link: string | null;
};

function statusLabel(s: number | null | undefined): string {
  if (s == null) return "—";
  switch (s) {
    case 0:
      return "삭제";
    case 1:
      return "서비스";
    case 3:
      return "자동삭제";
    case 9:
      return "수집중";
    default:
      return String(s);
  }
}

function formatTs(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export default function FilteringAdminPage() {
  const toast = useToast();
  const [platform, setPlatform] = useState<"all" | "tv_ott" | "web_show">("all");
  const [drama, setDrama] = useState<"all" | "drama" | "non_drama">("all");
  const [weekday, setWeekday] = useState<string>("");

  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [selectedPjSeq, setSelectedPjSeq] = useState<string | null>(null);

  const [contents, setContents] = useState<ContentRow[]>([]);
  const [loadingContents, setLoadingContents] = useState(false);
  const [selectedConts, setSelectedConts] = useState<Record<number, boolean>>({});
  const [patching, setPatching] = useState(false);

  const programsQuery = useMemo(() => {
    const p = new URLSearchParams();
    p.set("platform", platform);
    p.set("drama", drama);
    if (weekday !== "") p.set("weekday", weekday);
    return p.toString();
  }, [platform, drama, weekday]);

  const loadPrograms = useCallback(
    async (opts?: { resetSelection?: boolean }) => {
      setLoadingPrograms(true);
      try {
        const json = await fetchJson<{ ok: boolean; items: ProgramRow[] }>(
          `/api/filtering/programs?${programsQuery}`,
          { cache: "no-store" }
        );
        setPrograms(json.items ?? []);
        if (opts?.resetSelection) {
          setSelectedPjSeq(null);
          setContents([]);
          setSelectedConts({});
        }
      } catch (e) {
        toast.error("목록 실패", errorMessage(e, "프로그램 집계를 불러오지 못했습니다."));
        setPrograms([]);
      }
      setLoadingPrograms(false);
    },
    [programsQuery, toast]
  );

  const loadContents = useCallback(
    async (pjSeq: string) => {
      setLoadingContents(true);
      setSelectedConts({});
      try {
        const json = await fetchJson<{ ok: boolean; items: ContentRow[] }>(
          `/api/filtering/contents?pj_seq=${encodeURIComponent(pjSeq)}`,
          { cache: "no-store" }
        );
        setContents(json.items ?? []);
      } catch (e) {
        toast.error("문서 목록 실패", errorMessage(e, "수집문서를 불러오지 못했습니다."));
        setContents([]);
      }
      setLoadingContents(false);
    },
    [toast]
  );

  function onSelectProgram(r: ProgramRow) {
    setSelectedPjSeq(r.pj_seq);
    void loadContents(r.pj_seq);
  }

  const selectedIds = useMemo(
    () =>
      Object.entries(selectedConts)
        .filter(([, v]) => v)
        .map(([k]) => Number.parseInt(k, 10))
        .filter((n) => Number.isInteger(n)),
    [selectedConts]
  );

  const allChecked =
    contents.length > 0 && contents.every((c) => selectedConts[c.conts_seq]);
  const someChecked = selectedIds.length > 0;

  function toggleAll(checked: boolean) {
    const next: Record<number, boolean> = {};
    if (checked) {
      for (const c of contents) next[c.conts_seq] = true;
    }
    setSelectedConts(next);
  }

  async function onPatch(action: "delete" | "restore") {
    if (selectedIds.length === 0) {
      toast.error("선택 필요", "체크한 글이 없습니다.");
      return;
    }
    const msg =
      action === "delete"
        ? "선택한 글들을 삭제 하시겠습니까?"
        : "선택한 글들을 복구 하시겠습니까?";
    if (!window.confirm(msg)) return;

    setPatching(true);
    try {
      await fetchJson<{ ok: boolean; updated: number }>("/api/filtering/contents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, conts_seqs: selectedIds }),
      });
      toast.success(action === "delete" ? "삭제 처리" : "복구 처리", `${selectedIds.length}건`);
      await loadPrograms();
      if (selectedPjSeq) await loadContents(selectedPjSeq);
    } catch (e) {
      toast.error("처리 실패", errorMessage(e, "처리 실패"));
    }
    setPatching(false);
  }

  const selectedProgram = programs.find((p) => p.pj_seq === selectedPjSeq) ?? null;

  return (
    <div className="w-full max-w-none">
      <PageHeader
        title="필터링 관리"
        subtitle="우측: 프로그램별 수집문서 건수(raw_contents.conts_status=1) · 좌측: 선택 프로그램의 문서 목록 · 삭제(0)·복구(9)"
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-300">플랫폼</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as typeof platform)}
            className="mt-1 min-w-[200px] rounded-md border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-emerald-400/70"
          >
            <option value="all">전체</option>
            <option value="tv_ott">TV-OTT (cl001·cl002·cl003·cl900)</option>
            <option value="web_show">TV-OTT WEB Show (cl901)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-300">드라마 구분</label>
          <select
            value={drama}
            onChange={(e) => setDrama(e.target.value as typeof drama)}
            className="mt-1 min-w-[160px] rounded-md border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-emerald-400/70"
          >
            <option value="all">전체</option>
            <option value="drama">드라마 (cat001)</option>
            <option value="non_drama">비드라마</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-300">방송 요일</label>
          <select
            value={weekday}
            onChange={(e) => setWeekday(e.target.value)}
            className="mt-1 min-w-[140px] rounded-md border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-emerald-400/70"
          >
            <option value="">전체</option>
            {WEEKDAYS.map((d) => (
              <option key={d.key} value={String(d.key)}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => void loadPrograms({ resetSelection: true })}
          disabled={loadingPrograms}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingPrograms ? "불러오는 중…" : "조회"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.85fr)]">
        <div className="order-2 min-h-[420px] rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 xl:order-1">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-zinc-100">수집문서 (좌)</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!someChecked || patching}
                onClick={() => void onPatch("delete")}
                className="rounded-md border border-rose-600/60 bg-rose-950/40 px-3 py-1.5 text-xs font-medium text-rose-100 hover:bg-rose-900/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {patching ? "처리 중…" : "삭제"}
              </button>
              <button
                type="button"
                disabled={!someChecked || patching}
                onClick={() => void onPatch("restore")}
                className="rounded-md border border-amber-600/60 bg-amber-950/40 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-900/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {patching ? "처리 중…" : "복구"}
              </button>
            </div>
          </div>
          {selectedProgram ? (
            <p className="mb-2 text-xs text-zinc-400">
              선택:{" "}
              <span className="font-mono text-zinc-200">{selectedProgram.pj_seq}</span> ·{" "}
              <span className="text-zinc-200">{selectedProgram.pjname}</span>
            </p>
          ) : (
            <p className="mb-2 text-xs text-zinc-500">우측에서 프로그램을 선택하면 목록이 열립니다.</p>
          )}

          <div className="max-h-[min(62vh,560px)] overflow-x-auto overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/50">
            <table className="w-full min-w-[880px] table-auto text-left text-sm text-zinc-100">
              <thead className="sticky top-0 z-10 bg-zinc-950">
                <tr className="text-xs text-zinc-400">
                  <th className="w-10 px-2 py-2">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      disabled={contents.length === 0 || loadingContents}
                      onChange={(e) => toggleAll(e.target.checked)}
                      aria-label="전체 선택"
                    />
                  </th>
                  <th className="w-20 whitespace-nowrap px-2 py-2">상태</th>
                  <th className="w-24 whitespace-nowrap px-2 py-2">conts_seq</th>
                  <th className="min-w-[160px] px-2 py-2">사이트</th>
                  <th className="min-w-[200px] px-2 py-2">제목</th>
                  <th className="w-28 whitespace-nowrap px-2 py-2">작성일</th>
                  <th className="w-16 whitespace-nowrap px-2 py-2">댓글</th>
                  <th className="w-16 whitespace-nowrap px-2 py-2">조회</th>
                </tr>
              </thead>
              <tbody>
                {loadingContents ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-sm text-zinc-500">
                      불러오는 중…
                    </td>
                  </tr>
                ) : contents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-sm text-zinc-500">
                      {selectedPjSeq ? "문서가 없습니다." : "프로그램을 선택하세요."}
                    </td>
                  </tr>
                ) : (
                  contents.map((c) => (
                    <tr
                      key={c.conts_seq}
                      className="border-t border-white/10 bg-zinc-950/50 hover:bg-zinc-800/40"
                    >
                      <td className="px-2 py-2 align-top">
                        <input
                          type="checkbox"
                          checked={!!selectedConts[c.conts_seq]}
                          onChange={(e) =>
                            setSelectedConts((prev) => ({
                              ...prev,
                              [c.conts_seq]: e.target.checked,
                            }))
                          }
                          aria-label={`선택 ${c.conts_seq}`}
                        />
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 align-top text-xs text-zinc-300">
                        {statusLabel(c.conts_status)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 align-top font-mono text-xs text-zinc-400">
                        {c.conts_seq}
                      </td>
                      <td className="px-2 py-2 align-top text-xs text-zinc-300">
                        <div className="break-words" title={c.site_name ?? c.site_id ?? undefined}>
                          {c.site_name ?? c.site_id ?? "—"}
                        </div>
                      </td>
                      <td className="px-2 py-2 align-top text-zinc-100">
                        <div className="line-clamp-2 break-words" title={c.title ?? undefined}>
                          {c.title ?? "—"}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 align-top font-mono text-xs text-zinc-400">
                        {formatTs(c.wdate)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 align-top font-mono text-xs text-zinc-400">
                        {c.rp_count ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 align-top font-mono text-xs text-zinc-400">
                        {c.v_count ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {contents.length > 0 ? (
            <p className="mt-2 text-xs text-zinc-500">최대 300건까지 표시됩니다.</p>
          ) : null}
        </div>

        <div className="order-1 min-h-[320px] rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 xl:order-2">
          <div className="mb-2 text-sm font-semibold text-zinc-100">프로그램별 집계 (우)</div>
          <p className="mb-3 text-xs text-zinc-500">건수는 conts_status=1(서비스) 기준입니다.</p>
          <div className="max-h-[min(70vh,640px)] overflow-x-auto overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/50">
            <table className="w-full table-auto text-left text-sm text-zinc-100">
              <thead className="sticky top-0 z-10 bg-zinc-950">
                <tr className="text-xs text-zinc-400">
                  <th className="px-3 py-2">pj_seq</th>
                  <th className="min-w-[160px] px-3 py-2">프로그램</th>
                  <th className="w-24 whitespace-nowrap px-3 py-2 text-right">건수</th>
                </tr>
              </thead>
              <tbody>
                {loadingPrograms ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-sm text-zinc-500">
                      불러오는 중…
                    </td>
                  </tr>
                ) : programs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-sm text-zinc-500">
                      「조회」로 집계를 불러오세요.
                    </td>
                  </tr>
                ) : (
                  programs.map((r) => {
                    const active = selectedPjSeq === r.pj_seq;
                    return (
                      <tr
                        key={r.pj_seq}
                        onClick={() => onSelectProgram(r)}
                        className={[
                          "cursor-pointer border-t border-white/10",
                          active ? "bg-indigo-950/50 hover:bg-indigo-900/40" : "bg-zinc-950/50 hover:bg-zinc-800/40",
                        ].join(" ")}
                      >
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-zinc-300">
                          {r.pj_seq}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="break-words text-zinc-100" title={r.pjname}>
                            {r.pjname}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-sm text-emerald-300/90">
                          {r.doc_count}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {programs.length > 0 ? (
            <p className="mt-2 text-xs text-zinc-500">최대 500건까지 표시됩니다.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
