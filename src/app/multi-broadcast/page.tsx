"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/Toaster";
import { fetchJson } from "@/lib/fetchJson";
import { errorMessage } from "@/lib/errors";

type Pclass = { class_id: string; class_name: string | null };
type BroadcastRow = {
  pj_seq: string;
  pjname: string;
  base_class: string | null;
  extra_classes: string[];
  group_names: string[];
};

export default function MultiBroadcastPage() {
  const toast = useToast();
  const [pclass, setPclass] = useState<Pclass[]>([]);
  const [rows, setRows] = useState<BroadcastRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pjSeq, setPjSeq] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [stationQ, setStationQ] = useState("");
  const [programQ, setProgramQ] = useState("");

  const filteredStations = useMemo(() => {
    const q = stationQ.trim().toLowerCase();
    if (!q) return pclass;
    return pclass.filter((s) =>
      `${s.class_name ?? ""} ${s.class_id}`.toLowerCase().includes(q)
    );
  }, [pclass, stationQ]);

  const filteredRows = useMemo(() => {
    const q = programQ.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.pjname.toLowerCase().includes(q) || r.pj_seq.includes(q)
    );
  }, [rows, programQ]);

  const current = useMemo(() => rows.find((r) => r.pj_seq === pjSeq) ?? null, [rows, pjSeq]);
  const selectedIds = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [selected]
  );
  const selectedNames = useMemo(() => {
    const byId = new Map(pclass.map((p) => [p.class_id, p.class_name ?? p.class_id]));
    return selectedIds.map((id) => byId.get(id) ?? id);
  }, [pclass, selectedIds]);

  const diff = useMemo(() => {
    // current.extra_classes contains names; diff against selected names
    const prev = new Set(current?.extra_classes ?? []);
    const next = new Set(selectedNames);
    const added = selectedNames.filter((n) => !prev.has(n));
    const removed = (current?.extra_classes ?? []).filter((n) => !next.has(n));
    return { added, removed };
  }, [current, selectedNames]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        fetchJson<{ items: Pclass[] }>("/api/pclass", { cache: "no-store" }),
        fetchJson<{ items: BroadcastRow[] }>("/api/projects/broadcasts", {
          cache: "no-store",
        }),
      ]);
      setPclass(a.items ?? []);
      setRows(b.items ?? []);
    } catch (e) {
      toast.error("불러오기 실패", errorMessage(e, "불러오기 실패"));
    }
    setLoading(false);
  }, [toast]);

  async function onSave() {
    setSaving(true);
    try {
      await fetchJson<{ ok: boolean }>("/api/projects/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pjSeq, groupName, classIds: selectedIds }),
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

  const onPickProgram = useCallback(
    (r: BroadcastRow) => {
      setPjSeq(r.pj_seq);
      setGroupName(r.group_names?.[0] ?? "");
      const byName = new Map(pclass.map((p) => [p.class_name ?? p.class_id, p.class_id]));
      const next: Record<string, boolean> = {};
      for (const nm of r.extra_classes ?? []) {
        const id = byName.get(nm);
        if (id) next[id] = true;
      }
      setSelected(next);
    },
    [pclass]
  );

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="다중 방송국 등록"
        subtitle="프로그램번호(1개) + 다중방송국명 + 방송국명(복수 선택) 등록"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-200">
                프로그램번호 (숫자, 1개)
              </label>
              <input
                value={pjSeq}
                onChange={(e) => setPjSeq(e.target.value)}
                placeholder="예: 85"
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-600 focus:border-white/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-200">다중방송국명</label>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="예: 디스커버리 채널/ENA PLAY"
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-600 focus:border-white/20"
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-end justify-between gap-3">
              <label className="block text-sm font-medium text-zinc-200">방송국명(복수 선택)</label>
              <input
                value={stationQ}
                onChange={(e) => setStationQ(e.target.value)}
                placeholder="방송국 검색"
                className="w-44 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-zinc-50 outline-none placeholder:text-zinc-600 focus:border-white/20"
              />
            </div>

            <div className="mt-2 max-h-80 overflow-auto rounded-lg border border-white/10 bg-black/20 p-2">
              {filteredStations.length === 0 ? (
                <div className="p-2 text-sm text-zinc-500">검색 결과 없음</div>
              ) : (
                <div className="flex flex-col gap-1">
                  {filteredStations.map((s) => {
                    const label = s.class_name ? `${s.class_name}` : s.class_id;
                    return (
                      <label
                        key={s.class_id}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm text-zinc-200 hover:bg-white/5"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(selected[s.class_id])}
                          onChange={(e) =>
                            setSelected((prev) => ({
                              ...prev,
                              [s.class_id]: e.target.checked,
                            }))
                          }
                        />
                        <span className="flex-1">{label}</span>
                        <span className="text-xs text-zinc-500">{s.class_id}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-xs text-zinc-500">
              선택:{" "}
              <span className="text-zinc-200">
                {Object.values(selected).filter(Boolean).length}
              </span>
              개
            </div>
            <button
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "등록 중..." : "등록"}
            </button>
          </div>

          <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="text-xs font-semibold text-zinc-200">등록 전 → 후 (diff)</div>
            <div className="mt-1 text-xs text-zinc-400">
              현재:{" "}
              <span className="text-zinc-200">
                {current?.extra_classes?.length ? current.extra_classes.join(" / ") : "-"}
              </span>
              {"  "}→ 변경:{" "}
              <span className="text-zinc-200">
                {selectedNames.length ? selectedNames.join(" / ") : "-"}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {diff.added.slice(0, 12).map((n) => (
                <span
                  key={`a-${n}`}
                  className="rounded-full border border-emerald-400/20 bg-emerald-950/30 px-2 py-0.5 text-[11px] text-emerald-200"
                >
                  +{n}
                </span>
              ))}
              {diff.removed.slice(0, 12).map((n) => (
                <span
                  key={`r-${n}`}
                  className="rounded-full border border-rose-400/20 bg-rose-950/30 px-2 py-0.5 text-[11px] text-rose-200"
                >
                  -{n}
                </span>
              ))}
              {diff.added.length + diff.removed.length === 0 ? (
                <span className="text-xs text-zinc-500">변경 없음</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-zinc-100">다중방송 등록된 프로그램</div>
            <div className="flex items-center gap-2">
              <input
                value={programQ}
                onChange={(e) => setProgramQ(e.target.value)}
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
                    <th className="w-56 px-3 py-2">프로그램명</th>
                    <th className="w-44 px-3 py-2">방송사</th>
                    <th className="px-3 py-2">추가 방송사</th>
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
                          onClick={() => onPickProgram(r)}
                          className="text-left hover:underline"
                        >
                          {r.pjname}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-zinc-200">{r.base_class ?? "-"}</td>
                      <td className="px-3 py-2 text-zinc-200">
                        {r.extra_classes.length ? r.extra_classes.join(" / ") : "-"}
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

