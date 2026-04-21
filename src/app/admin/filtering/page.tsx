"use client";

import { Fragment, useCallback, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/Toaster";
import { fetchJson } from "@/lib/fetchJson";
import { errorMessage } from "@/lib/errors";
import { WEEKDAYS } from "@/lib/parsers";
import type { ChannelBucket } from "@/lib/filteringChannelBucket";

type ProgramRow = { rank: number; pj_seq: string; pjname: string; doc_count: number };

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

type ChannelAgg = { total: number; news: number; von: number; vd: number; sns: number };
type SearchField = "title" | "body" | "title_body";
type MatchMode = "like" | "not";
type ContentsStatus = "normal" | "deleted" | "all";
type SortKey = "rp_desc" | "v_desc" | "wdate_desc" | "wdate_asc";

type DetailItem = {
  conts_seq: number;
  pj_seq: number;
  site_id: string | null;
  site_name: string | null;
  title: string | null;
  body: string | null;
  writer: string | null;
  wdate: string | null;
  cwdate: string | null;
  conts_status: number | null;
  rp_count: number | null;
  v_count: number | null;
  origin_link: string | null;
  origin: string | null;
  pjname: string;
};

/** 로컬 기준 yyyy-mm-dd (목록 작성일) */
function formatDateYmd(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateOnly(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function bucketLabel(b: ChannelBucket | "all"): string {
  switch (b) {
    case "news":
      return "뉴스";
    case "von":
      return "VON";
    case "vd":
      return "VD";
    case "sns":
      return "SNS";
    default:
      return "전체";
  }
}

function PaginationBar(props: {
  page: number;
  totalPages: number;
  total: number;
  disabled: boolean;
  onPageChange: (p: number) => void;
}) {
  const { page, totalPages, total, disabled, onPageChange } = props;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
      <span>
        총 {total.toLocaleString("ko-KR")}건 · {page}/{totalPages}페이지
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded border border-zinc-600 px-2 py-1 text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
        >
          이전
        </button>
        <button
          type="button"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded border border-zinc-600 px-2 py-1 text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
        >
          다음
        </button>
      </div>
    </div>
  );
}

export default function FilteringAdminPage() {
  const toast = useToast();
  const [platform, setPlatform] = useState<"all" | "tv_ott" | "web_show">("all");
  const [drama, setDrama] = useState<"all" | "drama" | "non_drama">("all");
  const [weekday, setWeekday] = useState<string>("");

  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [selectedPjSeq, setSelectedPjSeq] = useState<string | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<ChannelBucket | "all">("all");
  const [contentsPage, setContentsPage] = useState(1);
  const [pageSize, setPageSize] = useState<100 | 200 | 500>(200);
  const [sort, setSort] = useState<SortKey>("wdate_desc");
  const [status, setStatus] = useState<ContentsStatus>("normal");
  const [searchField, setSearchField] = useState<SearchField>("title_body");
  const [matchMode, setMatchMode] = useState<MatchMode>("like");
  const [keyword, setKeyword] = useState("");

  const [expandedPjSeq, setExpandedPjSeq] = useState<string | null>(null);
  const [channelAgg, setChannelAgg] = useState<ChannelAgg | null>(null);
  const [loadingChannels, setLoadingChannels] = useState(false);

  const [contents, setContents] = useState<ContentRow[]>([]);
  const [contentsTotal, setContentsTotal] = useState(0);
  const [contentsTotalPages, setContentsTotalPages] = useState(1);
  const [loadingContents, setLoadingContents] = useState(false);
  const [selectedConts, setSelectedConts] = useState<Record<number, boolean>>({});
  const [patching, setPatching] = useState(false);

  const [openDetailSeq, setOpenDetailSeq] = useState<number | null>(null);
  const [detailBySeq, setDetailBySeq] = useState<Record<number, DetailItem>>({});
  const [loadingDetailSeq, setLoadingDetailSeq] = useState<number | null>(null);

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
          setSelectedBucket("all");
          setContentsPage(1);
          setContents([]);
          setContentsTotal(0);
          setContentsTotalPages(1);
          setSelectedConts({});
          setExpandedPjSeq(null);
          setChannelAgg(null);
          setOpenDetailSeq(null);
        }
      } catch (e) {
        toast.error("목록 실패", errorMessage(e, "프로그램 집계를 불러오지 못했습니다."));
        setPrograms([]);
      }
      setLoadingPrograms(false);
    },
    [programsQuery, toast]
  );

  const fetchChannelAgg = useCallback(async (pjSeq: string) => {
    setLoadingChannels(true);
    try {
      const json = await fetchJson<ChannelAgg & { ok: boolean }>(
        `/api/filtering/channels?pj_seq=${encodeURIComponent(pjSeq)}`,
        { cache: "no-store" }
      );
      setChannelAgg({
        total: json.total,
        news: json.news,
        von: json.von,
        vd: json.vd,
        sns: json.sns,
      });
    } catch (e) {
      toast.error("채널 집계 실패", errorMessage(e, "채널 집계를 불러오지 못했습니다."));
      setChannelAgg(null);
    }
    setLoadingChannels(false);
  }, [toast]);

  const loadContents = useCallback(
    async (pjSeq: string, bucket: ChannelBucket | "all", page: number) => {
      setSelectedPjSeq(pjSeq);
      setSelectedBucket(bucket);
      setContentsPage(page);
      setLoadingContents(true);
      setSelectedConts({});
      setOpenDetailSeq(null);
      const q = new URLSearchParams({
        pj_seq: pjSeq,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (bucket !== "all") q.set("bucket", bucket);
      q.set("sort", sort);
      q.set("status", status);
      const trimmedKeyword = keyword.trim();
      if (trimmedKeyword !== "") {
        q.set("q", trimmedKeyword);
        q.set("searchField", searchField);
        q.set("matchMode", matchMode);
      }
      try {
        const json = await fetchJson<{
          ok: boolean;
          items: ContentRow[];
          total: number;
          totalPages: number;
          page: number;
        }>(`/api/filtering/contents?${q.toString()}`, { cache: "no-store" });
        setContents(json.items ?? []);
        setContentsTotal(json.total ?? 0);
        setContentsTotalPages(Math.max(1, json.totalPages ?? 1));
      } catch (e) {
        toast.error("문서 목록 실패", errorMessage(e, "수집문서를 불러오지 못했습니다."));
        setContents([]);
        setContentsTotal(0);
        setContentsTotalPages(1);
      }
      setLoadingContents(false);
    },
    [keyword, matchMode, pageSize, searchField, sort, status, toast]
  );

  function onToggleProgramName(pjSeq: string) {
    if (expandedPjSeq === pjSeq) {
      setExpandedPjSeq(null);
      setChannelAgg(null);
      return;
    }
    setExpandedPjSeq(pjSeq);
    setChannelAgg(null);
    void fetchChannelAgg(pjSeq);
  }

  function onClickMainCount(r: ProgramRow) {
    setExpandedPjSeq(null);
    setChannelAgg(null);
    void loadContents(r.pj_seq, "all", 1);
  }

  function onClickBucketCount(pjSeq: string, b: ChannelBucket | "all") {
    void loadContents(pjSeq, b, 1);
  }

  async function onToggleTitle(contsSeq: number) {
    if (openDetailSeq === contsSeq) {
      setOpenDetailSeq(null);
      return;
    }
    setOpenDetailSeq(contsSeq);
    if (detailBySeq[contsSeq]) return;
    setLoadingDetailSeq(contsSeq);
    try {
      const json = await fetchJson<{ ok: boolean; item: DetailItem }>(
        `/api/filtering/contents/detail?conts_seq=${encodeURIComponent(String(contsSeq))}`,
        { cache: "no-store" }
      );
      setDetailBySeq((prev) => ({ ...prev, [contsSeq]: json.item }));
    } catch (e) {
      toast.error("상세 불러오기 실패", errorMessage(e, "상세를 불러오지 못했습니다."));
      setOpenDetailSeq(null);
    }
    setLoadingDetailSeq(null);
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
      if (selectedPjSeq) {
        await loadContents(selectedPjSeq, selectedBucket, contentsPage);
        if (expandedPjSeq === selectedPjSeq) await fetchChannelAgg(selectedPjSeq);
      }
    } catch (e) {
      toast.error("처리 실패", errorMessage(e, "처리 실패"));
    }
    setPatching(false);
  }

  const selectedProgram = programs.find((p) => p.pj_seq === selectedPjSeq) ?? null;

  const onPageChange = useCallback(
    (p: number) => {
      if (!selectedPjSeq) return;
      void loadContents(selectedPjSeq, selectedBucket, p);
    },
    [loadContents, selectedPjSeq, selectedBucket]
  );

  const onSearchContents = useCallback(() => {
    if (!selectedPjSeq) {
      toast.error("선택 필요", "우측에서 프로그램·매체를 먼저 선택하세요.");
      return;
    }
    void loadContents(selectedPjSeq, selectedBucket, 1);
  }, [loadContents, selectedBucket, selectedPjSeq, toast]);

  return (
    <div className="w-full max-w-none">
      <PageHeader
        title="필터링 관리"
        subtitle="우측: conts_status=1·project 조인 집계(건수 많은 순) · 프로그램명 클릭 시 채널별 집계 · 수치 클릭 시 좌측 목록 · 좌측 제목 클릭 시 상세"
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
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
              {" · "}
              <span className="text-emerald-300/90">매체: {bucketLabel(selectedBucket)}</span>
            </p>
          ) : (
            <p className="mb-2 text-xs text-zinc-500">
              우측에서 건수 또는 채널 수치를 누르면 목록이 열립니다.
            </p>
          )}

          <div className="mb-2 flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400">건수</label>
              <select
                value={String(pageSize)}
                onChange={(e) => setPageSize(Number(e.target.value) as 100 | 200 | 500)}
                className="mt-1 min-w-[90px] rounded-md border border-zinc-700 bg-zinc-950/70 px-2.5 py-1.5 text-xs text-zinc-50 outline-none focus:border-emerald-400/70"
              >
                <option value="100">100개</option>
                <option value="200">200개</option>
                <option value="500">500개</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-400">정렬</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="mt-1 min-w-[140px] rounded-md border border-zinc-700 bg-zinc-950/70 px-2.5 py-1.5 text-xs text-zinc-50 outline-none focus:border-emerald-400/70"
              >
                <option value="rp_desc">댓글수 많은순</option>
                <option value="v_desc">조회수 많은순</option>
                <option value="wdate_desc">날짜 최근순</option>
                <option value="wdate_asc">날짜 오래된순</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-400">상태</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ContentsStatus)}
                className="mt-1 min-w-[100px] rounded-md border border-zinc-700 bg-zinc-950/70 px-2.5 py-1.5 text-xs text-zinc-50 outline-none focus:border-emerald-400/70"
              >
                <option value="normal">정상글</option>
                <option value="deleted">삭제글</option>
                <option value="all">전체글</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-400">검색대상</label>
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value as SearchField)}
                className="mt-1 min-w-[120px] rounded-md border border-zinc-700 bg-zinc-950/70 px-2.5 py-1.5 text-xs text-zinc-50 outline-none focus:border-emerald-400/70"
              >
                <option value="title">제목</option>
                <option value="body">본문</option>
                <option value="title_body">제목+본문</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-400">Like</label>
              <select
                value={matchMode}
                onChange={(e) => setMatchMode(e.target.value as MatchMode)}
                className="mt-1 min-w-[88px] rounded-md border border-zinc-700 bg-zinc-950/70 px-2.5 py-1.5 text-xs text-zinc-50 outline-none focus:border-emerald-400/70"
              >
                <option value="like">Like</option>
                <option value="not">Not</option>
              </select>
            </div>
            <div className="min-w-[220px] flex-1">
              <label className="block text-[11px] font-medium text-zinc-400">검색어</label>
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSearchContents();
                }}
                placeholder="키워드를 입력하세요"
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950/70 px-3 py-1.5 text-xs text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-emerald-400/70"
              />
            </div>
            <button
              type="button"
              onClick={onSearchContents}
              disabled={loadingContents || !selectedPjSeq}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-800/80 disabled:cursor-not-allowed disabled:opacity-60"
            >
              검색
            </button>
          </div>

          <div className="mb-2">
            <PaginationBar
              page={contentsPage}
              totalPages={contentsTotalPages}
              total={contentsTotal}
              disabled={loadingContents || !selectedPjSeq}
              onPageChange={onPageChange}
            />
          </div>

          <div className="max-h-[min(62vh,560px)] overflow-x-auto overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/50">
            <table className="w-full min-w-[720px] table-fixed text-left text-sm text-zinc-100">
              <colgroup>
                <col className="w-14" />
                <col className="w-24" />
                <col className="w-[4.9rem]" />
                <col className="w-[45%]" />
                <col className="w-[4.9rem]" />
                <col className="w-14" />
                <col className="w-14" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-zinc-950">
                <tr className="text-xs text-zinc-400">
                  <th className="px-2 py-2">
                    <input
                      type="checkbox"
                      className="h-8 w-8 cursor-pointer accent-emerald-500"
                      checked={allChecked}
                      disabled={contents.length === 0 || loadingContents}
                      onChange={(e) => toggleAll(e.target.checked)}
                      aria-label="전체 선택"
                    />
                  </th>
                  <th className="whitespace-nowrap px-2 py-2">conts_seq</th>
                  <th className="px-2 py-2">사이트</th>
                  <th className="min-w-0 px-2 py-2">제목</th>
                  <th className="whitespace-nowrap px-2 py-2">작성일</th>
                  <th className="whitespace-nowrap px-2 py-2">댓글</th>
                  <th className="whitespace-nowrap px-2 py-2">조회</th>
                </tr>
              </thead>
              <tbody>
                {loadingContents ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-sm text-zinc-500">
                      불러오는 중…
                    </td>
                  </tr>
                ) : contents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-sm text-zinc-500">
                      {selectedPjSeq ? "문서가 없습니다." : "우측에서 프로그램·매체를 선택하세요."}
                    </td>
                  </tr>
                ) : (
                  contents.map((c) => (
                    <Fragment key={c.conts_seq}>
                      <tr className="border-t border-white/10 bg-zinc-950/50 hover:bg-zinc-800/40">
                        <td className="px-2 py-2 align-top">
                          <input
                            type="checkbox"
                            className="h-8 w-8 cursor-pointer accent-emerald-500"
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
                        <td className="whitespace-nowrap px-2 py-2 align-top font-mono text-xs text-zinc-400">
                          {c.conts_seq}
                        </td>
                        <td className="max-w-[4.9rem] px-2 py-2 align-top text-xs text-zinc-300">
                          <div
                            className="truncate"
                            title={c.site_name ?? c.site_id ?? undefined}
                          >
                            {c.site_name ?? c.site_id ?? "—"}
                          </div>
                        </td>
                        <td className="min-w-0 px-2 py-2 align-top text-zinc-100">
                          <button
                            type="button"
                            onClick={() => void onToggleTitle(c.conts_seq)}
                            className="w-full min-w-0 text-left underline-offset-2 hover:underline"
                          >
                            <span className="line-clamp-2 break-words">{c.title ?? "—"}</span>
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-1.5 py-2 align-top font-mono text-xs text-zinc-400">
                          {formatDateYmd(c.wdate)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 align-top font-mono text-xs text-zinc-400">
                          {c.rp_count ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 align-top font-mono text-xs text-zinc-400">
                          {c.v_count ?? "—"}
                        </td>
                      </tr>
                      {openDetailSeq === c.conts_seq ? (
                        <tr className="border-t border-white/5 bg-zinc-900/90">
                          <td colSpan={7} className="px-3 py-3">
                            {loadingDetailSeq === c.conts_seq ? (
                              <p className="text-sm text-zinc-500">상세 불러오는 중…</p>
                            ) : detailBySeq[c.conts_seq] ? (
                              <DetailPanel d={detailBySeq[c.conts_seq]} />
                            ) : null}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-2">
            <PaginationBar
              page={contentsPage}
              totalPages={contentsTotalPages}
              total={contentsTotal}
              disabled={loadingContents || !selectedPjSeq}
              onPageChange={onPageChange}
            />
          </div>
        </div>

        <div className="order-1 min-h-[320px] rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 xl:order-2">
          <div className="mb-2 text-sm font-semibold text-zinc-100">프로그램별 집계 (우)</div>
          <p className="mb-3 text-xs text-zinc-500">
            conts_status=1(서비스)·project 조인 건만 집계 · 건수 많은 순
          </p>
          <div className="max-h-[min(70vh,640px)] overflow-x-auto overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/50">
            <table className="w-full table-auto text-left text-sm text-zinc-100">
              <thead className="sticky top-0 z-10 bg-zinc-950">
                <tr className="text-xs text-zinc-400">
                  <th className="w-12 whitespace-nowrap px-2 py-2">순위</th>
                  <th className="w-20 whitespace-nowrap px-2 py-2">pj_seq</th>
                  <th className="min-w-[140px] px-2 py-2">프로그램</th>
                  <th className="w-20 whitespace-nowrap px-2 py-2 text-right">건수</th>
                </tr>
              </thead>
              <tbody>
                {loadingPrograms ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-sm text-zinc-500">
                      불러오는 중…
                    </td>
                  </tr>
                ) : programs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-sm text-zinc-500">
                      「조회」로 집계를 불러오세요.
                    </td>
                  </tr>
                ) : (
                  programs.map((r) => (
                    <Fragment key={r.pj_seq}>
                      <tr
                        className={[
                          "border-t border-white/10",
                          selectedPjSeq === r.pj_seq
                            ? "bg-indigo-950/40"
                            : "bg-zinc-950/50 hover:bg-zinc-800/30",
                        ].join(" ")}
                      >
                        <td className="whitespace-nowrap px-2 py-2 font-mono text-xs text-zinc-400">
                          {r.rank}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 font-mono text-xs text-zinc-300">
                          {r.pj_seq}
                        </td>
                        <td className="px-2 py-2 align-top">
                          <button
                            type="button"
                            onClick={() => onToggleProgramName(r.pj_seq)}
                            className={[
                              "w-full text-left break-words hover:underline",
                              expandedPjSeq === r.pj_seq ? "text-indigo-300" : "text-zinc-100",
                            ].join(" ")}
                            title={r.pjname}
                          >
                            {r.pjname}
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => onClickMainCount(r)}
                            className="font-mono text-sm text-emerald-300/90 hover:underline"
                          >
                            {r.doc_count}
                          </button>
                        </td>
                      </tr>
                      {expandedPjSeq === r.pj_seq ? (
                        <tr className="border-t border-indigo-900/40 bg-indigo-950/20">
                          <td colSpan={4} className="px-3 py-3">
                            {loadingChannels ? (
                              <p className="text-xs text-zinc-500">채널 집계 불러오는 중…</p>
                            ) : channelAgg ? (
                              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                                <ChannelCell
                                  label="뉴스"
                                  value={channelAgg.news}
                                  onClick={() => onClickBucketCount(r.pj_seq, "news")}
                                />
                                <ChannelCell
                                  label="VON"
                                  value={channelAgg.von}
                                  onClick={() => onClickBucketCount(r.pj_seq, "von")}
                                />
                                <ChannelCell
                                  label="VD"
                                  value={channelAgg.vd}
                                  onClick={() => onClickBucketCount(r.pj_seq, "vd")}
                                />
                                <ChannelCell
                                  label="SNS"
                                  value={channelAgg.sns}
                                  onClick={() => onClickBucketCount(r.pj_seq, "sns")}
                                />
                                <ChannelCell
                                  label="전체"
                                  value={channelAgg.total}
                                  accent
                                  onClick={() => onClickBucketCount(r.pj_seq, "all")}
                                />
                              </div>
                            ) : (
                              <p className="text-xs text-zinc-500">집계 없음</p>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))
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

function ChannelCell(props: {
  label: string;
  value: number;
  accent?: boolean;
  onClick: () => void;
}) {
  const { label, value, accent, onClick } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex flex-col items-center gap-0.5 rounded-md border border-zinc-700/80 bg-zinc-900/80 px-3 py-1.5 text-left transition hover:border-emerald-500/50 hover:bg-zinc-800"
    >
      <span className="text-[10px] text-zinc-500">{label}</span>
      <span
        className={[
          "font-mono text-sm tabular-nums",
          accent ? "text-emerald-300" : "text-zinc-100",
        ].join(" ")}
      >
        {value.toLocaleString("ko-KR")}
      </span>
    </button>
  );
}

function DetailPanel({ d }: { d: DetailItem }) {
  const statLine = `조회수 ${d.v_count ?? 0} 댓글수 ${d.rp_count ?? 0}`;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-950/80 p-3 text-sm text-zinc-200">
      <div className="mb-3 grid grid-cols-1 gap-2 border-b border-zinc-800 pb-3 sm:grid-cols-[auto_1fr_auto_auto] sm:items-start sm:gap-x-3">
        <div className="font-medium text-zinc-100">{d.site_name ?? d.site_id ?? "—"}</div>
        <div className="font-mono text-xs text-zinc-400">{d.conts_seq}</div>
        <div className="sm:col-span-2 sm:col-start-2">
          <div className="text-zinc-50">{d.title ?? "—"}</div>
          <div className="mt-1 text-xs text-zinc-500">{statLine}</div>
        </div>
        <div className="text-xs text-zinc-500">작성일</div>
        <div className="text-xs text-zinc-300">{formatDateOnly(d.wdate)}</div>
      </div>
      <dl className="grid grid-cols-1 gap-0 sm:grid-cols-[100px_1fr]">
        <dt className="border border-zinc-800 bg-zinc-800/60 px-2 py-1.5 text-xs text-zinc-400">
          프로그램
        </dt>
        <dd className="border border-zinc-800 border-l-0 px-2 py-1.5 text-xs">{d.pjname}</dd>
        <dt className="border border-zinc-800 border-t-0 bg-zinc-800/60 px-2 py-1.5 text-xs text-zinc-400">
          게시자
        </dt>
        <dd className="border border-zinc-800 border-l-0 border-t-0 px-2 py-1.5 text-xs">
          {d.writer ?? "—"}
        </dd>
        <dt className="border border-zinc-800 border-t-0 bg-zinc-800/60 px-2 py-1.5 text-xs text-zinc-400">
          원문
        </dt>
        <dd className="border border-zinc-800 border-l-0 border-t-0 px-2 py-1.5 text-xs break-all">
          {d.origin_link ? (
            <a
              href={d.origin_link}
              target="_blank"
              rel="noreferrer"
              className="text-sky-400 underline hover:text-sky-300"
            >
              {d.origin_link}
            </a>
          ) : (
            "—"
          )}
        </dd>
        <dt className="border border-zinc-800 border-t-0 bg-zinc-800/60 px-2 py-1.5 text-xs text-zinc-400 align-top">
          내용
        </dt>
        <dd className="border border-zinc-800 border-l-0 border-t-0 px-2 py-1.5 text-xs whitespace-pre-wrap break-words">
          {d.body ?? "—"}
        </dd>
      </dl>
    </div>
  );
}
