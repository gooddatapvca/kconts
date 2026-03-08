"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { formatWeekdays, WEEKDAYS } from "@/lib/parsers";
import { useToast } from "@/components/Toaster";
import { fetchJson } from "@/lib/fetchJson";
import { errorMessage } from "@/lib/errors";

type Row = { pj_seq: string; pjname: string; service_day: number[] };

export default function MultiWeekdayPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pjSeq, setPjSeq] = useState("");
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [listQ, setListQ] = useState("");

  const pickedDays = useMemo(
    () =>
      WEEKDAYS.filter((d) => selected[d.key])
        .map((d) => d.key)
        .sort((a, b) => a - b),
    [selected]
  );

  const current = useMemo(() => rows.find((r) => r.pj_seq === pjSeq) ?? null, [rows, pjSeq]);
  const diff = useMemo(() => {
    const prev = new Set(current?.service_day ?? []);
    const next = new Set(pickedDays);
    const added = pickedDays.filter((d) => !prev.has(d));
    const removed = (current?.service_day ?? []).filter((d) => !next.has(d));
    return { added, removed };
  }, [current, pickedDays]);

  const filteredRows = useMemo(() => {
    const q = listQ.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.pjname.toLowerCase().includes(q) || r.pj_seq.includes(q)
    );
  }, [rows, listQ]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const json = await fetchJson<{ items: Row[] }>("/api/projects/weekdays", {
        cache: "no-store",
      });
      setRows(json.items ?? []);
    } catch (e) {
      toast.error("불러오기 실패", errorMessage(e, "불러오기 실패"));
    }
    setLoading(false);
  }, [toast]);

  async function onSave() {
    setSaving(true);
    try {
      await fetchJson<{ ok: boolean; days: number[] }>("/api/projects/weekdays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pjSeq, days: pickedDays }),
      });
      toast.success(
        "등록 완료",
        `${current?.pjname ?? pjSeq} · 추가 ${diff.added.length} / 삭제 ${diff.removed.length}`
      );
      await refresh();
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
    <div className="max-w-6xl">
      <PageHeader
        title="프로그램-다중요일 등록"
        subtitle="프로그램번호 + 요일 선택 → project.service_day(int[]) 갱신"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-4">
          <label className="block text-sm font-medium text-zinc-200">프로그램번호</label>
          <input
            value={pjSeq}
            onChange={(e) => setPjSeq(e.target.value)}
            placeholder="예: 85"
            className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-600 focus:border-white/20"
          />

          <div className="mt-4">
            <div className="text-sm font-medium text-zinc-200">요일</div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {WEEKDAYS.map((d) => (
                <label
                  key={d.key}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200 hover:bg-white/5"
                >
                  <span>{d.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(selected[d.key])}
                    onChange={(e) =>
                      setSelected((prev) => ({ ...prev, [d.key]: e.target.checked }))
                    }
                  />
                </label>
              ))}
            </div>
            <div className="mt-2 text-xs text-zinc-500">
              선택됨: <span className="text-zinc-200">{formatWeekdays(pickedDays)}</span>
            </div>
            <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="text-xs font-semibold text-zinc-200">등록 전 → 후 (diff)</div>
              <div className="mt-1 text-xs text-zinc-400">
                현재:{" "}
                <span className="text-zinc-200">
                  {formatWeekdays(current?.service_day ?? [])}
                </span>
                {"  "}→ 변경:{" "}
                <span className="text-zinc-200">{formatWeekdays(pickedDays)}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {diff.added.map((d) => (
                  <span
                    key={`a-${d}`}
                    className="rounded-full border border-emerald-400/20 bg-emerald-950/30 px-2 py-0.5 text-[11px] text-emerald-200"
                  >
                    +{WEEKDAYS.find((x) => x.key === d)?.label ?? d}
                  </span>
                ))}
                {diff.removed.map((d) => (
                  <span
                    key={`r-${d}`}
                    className="rounded-full border border-rose-400/20 bg-rose-950/30 px-2 py-0.5 text-[11px] text-rose-200"
                  >
                    -{WEEKDAYS.find((x) => x.key === d)?.label ?? d}
                  </span>
                ))}
                {diff.added.length + diff.removed.length === 0 ? (
                  <span className="text-xs text-zinc-500">변경 없음</span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              onClick={() => setSelected({})}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-200 hover:bg-white/5"
            >
              초기화
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "등록 중..." : "등록"}
            </button>
          </div>

        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-zinc-100">프로그램 설정된 방송요일</div>
            <div className="flex items-center gap-2">
              <input
                value={listQ}
                onChange={(e) => setListQ(e.target.value)}
                placeholder="프로그램명/번호 검색"
                className="w-48 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-zinc-50 outline-none placeholder:text-zinc-600 focus:border-white/20"
              />
              <button
                onClick={refresh}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5"
              >
                새로고침
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-zinc-400">불러오는 중...</div>
          ) : (
            <div className="max-h-[520px] overflow-auto rounded-lg border border-white/10">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="sticky top-0 bg-zinc-950">
                  <tr className="text-xs text-zinc-400">
                    <th className="w-20 px-3 py-2">번호</th>
                    <th className="px-3 py-2">프로그램명</th>
                    <th className="w-40 px-3 py-2">등록 요일</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r) => (
                    <tr key={r.pj_seq} className="border-t border-white/10">
                      <td className="px-3 py-2 font-mono text-xs text-zinc-300">
                        {r.pj_seq}
                      </td>
                      <td className="px-3 py-2 text-zinc-100">
                        <button
                          onClick={() => setPjSeq(r.pj_seq)}
                          className="text-left hover:underline"
                        >
                          {r.pjname}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-zinc-200">
                        {formatWeekdays(r.service_day)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

