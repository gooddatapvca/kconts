"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { parseCommaSeparatedBigints } from "@/lib/parsers";
import { useToast } from "@/components/Toaster";
import { fetchJson } from "@/lib/fetchJson";
import { errorMessage } from "@/lib/errors";

type ApiState = { items: string[] };

export default function TwitterManualPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ApiState>({ items: [] });
  const [input, setInput] = useState("");

  const parsed = useMemo(() => parseCommaSeparatedBigints(input).map(String), [input]);
  const diff = useMemo(() => {
    const prev = new Set(data.items);
    const next = new Set(parsed);
    const added = parsed.filter((x) => !prev.has(x));
    const removed = data.items.filter((x) => !next.has(x));
    return { added, removed };
  }, [data.items, parsed]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const json = await fetchJson<ApiState>("/api/twitter-targets", { cache: "no-store" });
      setData(json);
    } catch (e) {
      toast.error("불러오기 실패", errorMessage(e, "불러오기 실패"));
    }
    setLoading(false);
  }, [toast]);

  async function onSave() {
    setSaving(true);
    try {
      const json = await fetchJson<ApiState & { ok?: boolean }>(
        "/api/twitter-targets",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pjSeqs: parsed }),
        }
      );
      setData({ items: json.items ?? [] });
      toast.success("등록 완료", `추가 ${diff.added.length} / 삭제 ${diff.removed.length}`);
    } catch (e) {
      toast.error("저장 실패", errorMessage(e, "저장 실패"));
    }
    setSaving(false);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(t);
  }, [refresh]);

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="트위터 수동수집대상 등록"
        subtitle="프로그램번호를 콤마(,)로 구분해 입력 → 등록(기존 데이터는 truncate 후 insert)"
      />

      <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-4">
        <label className="block text-sm font-medium text-zinc-200">
          프로그램번호 입력 (텍스트, 콤마로 구분)
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="예: 85, 120, 6"
          className="mt-2 h-28 w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-50 outline-none ring-0 placeholder:text-zinc-600 focus:border-white/20"
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-xs text-zinc-500">
            인식된 번호: <span className="text-zinc-200">{parsed.length}</span>개
          </div>
          <button
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "등록 중..." : "등록"}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="text-xs font-semibold text-zinc-200">등록 전 → 후 (diff)</div>
            <div className="mt-1 text-xs text-zinc-400">
              추가 <span className="text-zinc-200">{diff.added.length}</span> / 삭제{" "}
              <span className="text-zinc-200">{diff.removed.length}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {diff.added.slice(0, 12).map((id) => (
                <span
                  key={`a-${id}`}
                  className="rounded-full border border-emerald-400/20 bg-emerald-950/30 px-2 py-0.5 text-[11px] text-emerald-200"
                >
                  +{id}
                </span>
              ))}
              {diff.removed.slice(0, 12).map((id) => (
                <span
                  key={`r-${id}`}
                  className="rounded-full border border-rose-400/20 bg-rose-950/30 px-2 py-0.5 text-[11px] text-rose-200"
                >
                  -{id}
                </span>
              ))}
              {diff.added.length + diff.removed.length === 0 ? (
                <span className="text-xs text-zinc-500">변경 없음</span>
              ) : null}
            </div>
            {diff.added.length > 12 || diff.removed.length > 12 ? (
              <div className="mt-2 text-[11px] text-zinc-500">
                (미리보기 12개까지 표시)
              </div>
            ) : null}
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="text-xs font-semibold text-zinc-200">입력 검증</div>
            <div className="mt-1 text-xs text-zinc-400">
              숫자만 인식합니다. 콤마로 구분하고 공백은 무시합니다.
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-zinc-950/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-zinc-100">등록된 프로그램번호</div>
          <button
            onClick={refresh}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5"
          >
            새로고침
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-zinc-400">불러오는 중...</div>
        ) : data.items.length === 0 ? (
          <div className="text-sm text-zinc-400">등록된 항목이 없습니다.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.items.map((id) => (
              <span
                key={id}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200"
              >
                {id}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

