"use client";

import { useCallback, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/Toaster";
import { fetchJson } from "@/lib/fetchJson";
import { errorMessage } from "@/lib/errors";

type Row = {
  top_seq: number;
  pj_seq: number;
  top_name: string;
  top_status: number | null;
  topic_type: string;
  person_seq: string | null;
  par_top_seq: number;
  pjname: string;
  topic_type_name: string | null;
};

export default function DeletedTopicsPage() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);

  const search = useCallback(async () => {
    const term = q.trim();
    if (!term) {
      toast.error("검색", "프로그램명(일부)을 입력하세요.");
      return;
    }
    setLoading(true);
    try {
      const json = await fetchJson<{ ok: boolean; items: Row[] }>(
        `/api/topics/deleted?q=${encodeURIComponent(term)}`,
        { cache: "no-store" }
      );
      setRows(json.items ?? []);
      if ((json.items ?? []).length === 0) {
        toast.success("검색 완료", "미사용 토픽이 없습니다.");
      }
    } catch (e) {
      toast.error("검색 실패", errorMessage(e, "검색 실패"));
      setRows([]);
    }
    setLoading(false);
  }, [q, toast]);

  async function onRestore(r: Row) {
    const ok = window.confirm("복구 하시겠습니까?");
    if (!ok) return;
    setRestoring(r.top_seq);
    try {
      await fetchJson<{ ok: boolean }>("/api/topics/deleted", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ top_seq: r.top_seq }),
      });
      toast.success("복구 완료", r.top_name);
      setRows((prev) => prev.filter((x) => x.top_seq !== r.top_seq));
    } catch (e) {
      toast.error("복구 실패", errorMessage(e, "복구 실패"));
    }
    setRestoring(null);
  }

  return (
    <div className="w-full max-w-none">
      <PageHeader
        title="삭제토픽 관리"
        subtitle="프로그램명 일부 입력 → 미사용(top_status=0) 토픽 최대 100건 · 복구 시 top_status=1"
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <label className="block text-xs font-medium text-zinc-300">프로그램명 (일부)</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void search();
            }}
            placeholder="예: 라디오스타"
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-emerald-400/70"
          />
        </div>
        <button
          type="button"
          onClick={() => void search()}
          disabled={loading}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "검색 중…" : "검색"}
        </button>
      </div>

      {rows.length === 0 && !loading ? (
        <p className="text-sm text-zinc-500">검색하면 목록이 표시됩니다.</p>
      ) : (
        <div className="max-h-[min(70vh,640px)] overflow-auto rounded-lg border border-zinc-800 bg-zinc-900/80">
          <table className="w-full table-fixed text-left text-sm text-zinc-100">
            <thead className="sticky top-0 z-10 bg-zinc-950">
              <tr className="text-xs text-zinc-400">
                <th className="w-14 px-3 py-2">top_seq</th>
                <th className="w-24 px-3 py-2">프로그램</th>
                <th className="w-20 px-3 py-2">타입코드</th>
                <th className="w-32 px-3 py-2">타입명</th>
                <th className="px-3 py-2">top_name</th>
                <th className="w-28 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.top_seq}
                  className="border-t border-white/10 bg-zinc-950/50 hover:bg-zinc-800/40"
                >
                  <td className="px-3 py-2 font-mono text-xs text-zinc-300">{r.top_seq}</td>
                  <td className="px-3 py-2 text-zinc-200">
                    <div className="truncate" title={r.pjname}>
                      {r.pjname}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-zinc-400">{r.topic_type}</td>
                  <td className="px-3 py-2 text-zinc-300">
                    <div className="truncate" title={r.topic_type_name ?? undefined}>
                      {r.topic_type_name ?? "—"}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-zinc-100">
                    <div className="truncate" title={r.top_name}>
                      {r.top_name}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => void onRestore(r)}
                      disabled={restoring === r.top_seq}
                      className="rounded-md border border-amber-600/60 bg-amber-950/40 px-2 py-1 text-xs text-amber-100 hover:bg-amber-900/50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {restoring === r.top_seq ? "처리 중…" : "복구"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 ? (
        <p className="mt-2 text-xs text-zinc-500">최대 100건까지 표시됩니다.</p>
      ) : null}
    </div>
  );
}
