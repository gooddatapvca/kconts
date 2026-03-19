"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/Toaster";
import { fetchJson } from "@/lib/fetchJson";
import { errorMessage } from "@/lib/errors";

type Row = {
  pj: string | null;
  pjname: string | null;
  galtype: string | null;
  galid: string | null;
  status: number | null;
};

type Draft = { pjSeq: string; galtype: string; galid: string };

/** 갤러리 종류 없음(공백·미입력) 허용 — 신규 행 기본값은 빈칸 */
const DEFAULT_GALTYPE = "";

export default function DcgalleryPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([
    { pjSeq: "", galtype: DEFAULT_GALTYPE, galid: "" },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listQ, setListQ] = useState("");

  const filteredRows = useMemo(() => {
    const q = listQ.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = `${r.pj ?? ""} ${r.pjname ?? ""} ${r.galtype ?? ""} ${r.galid ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, listQ]);

  const draftDiff = useMemo(() => {
    const existing = new Set(
      rows
        .map((r) => `${r.pj ?? ""}||${r.galtype ?? ""}||${r.galid ?? ""}`)
        .filter((k) => k !== "||")
    );
    const normalizedDrafts = drafts
      .map((d) => ({
        pj: d.pjSeq.trim(),
        galtype: d.galtype.trim(),
        galid: d.galid.trim(),
      }))
      .filter((d) => /^\d+$/.test(d.pj) && d.galid);
    const keys = normalizedDrafts.map(
      (d) => `${d.pj}||${d.galtype || ""}||${d.galid}`
    );
    const uniqueKeys = Array.from(new Set(keys));
    const willAdd = uniqueKeys.filter((k) => !existing.has(k));
    const already = uniqueKeys.filter((k) => existing.has(k));
    return { willAdd, already, totalValid: uniqueKeys.length };
  }, [drafts, rows]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const json = await fetchJson<{ items: Row[] }>("/api/dcgallery", { cache: "no-store" });
      setRows(json.items ?? []);
    } catch (e) {
      toast.error("불러오기 실패", errorMessage(e, "불러오기 실패"));
    }
    setLoading(false);
  }, [toast]);

  async function onSave() {
    setSaving(true);
    try {
      const json = await fetchJson<{ ok: boolean; count: number }>("/api/dcgallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: drafts }),
      });
      toast.success(
        "등록 완료",
        `유효 ${draftDiff.totalValid} · 신규 ${draftDiff.willAdd.length} · 요청 ${json.count}`
      );
      await refresh();
    } catch (e) {
      toast.error("저장 실패", errorMessage(e, "저장 실패"));
    }
    setSaving(false);
  }

  async function onDelete(r: Row) {
    if (!r.pj || !r.galid) return;
    const ok = window.confirm("삭제하시겠습니까?");
    if (!ok) return;
    try {
      await fetchJson<{ ok: boolean }>("/api/dcgallery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pj: r.pj,
          galtype: r.galtype ?? null,
          galid: r.galid,
        }),
      });
      toast.success("삭제 완료", `${r.pjname ?? r.pj} · ${r.galid}`);
      await refresh();
    } catch (e) {
      toast.error("삭제 실패", errorMessage(e, "삭제 실패"));
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(t);
  }, [refresh]);

  return (
    <div className="w-full max-w-none">
      <PageHeader
        title="DC갤러리-프로그램 등록"
        subtitle="프로그램번호 + 갤러리종류 + 갤러리ID 등록 (추가 버튼으로 입력폼 추가)"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
          <div className="mb-3 text-sm font-semibold text-zinc-100">등록</div>

          <div className="flex flex-col gap-2">
            {drafts.map((d, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 gap-2 rounded-lg border border-zinc-800 bg-zinc-950/80 p-3 sm:grid-cols-3"
              >
                <div>
                  <label className="block text-xs font-medium text-zinc-300">
                    프로그램번호
                  </label>
                  <input
                    value={d.pjSeq}
                    onChange={(e) =>
                      setDrafts((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, pjSeq: e.target.value } : x))
                      )
                    }
                    placeholder="예: 6"
                    className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-emerald-400/70"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300">
                    갤러리종류
                  </label>
                  <input
                    value={d.galtype}
                    onChange={(e) =>
                      setDrafts((prev) =>
                        prev.map((x, i) =>
                          i === idx ? { ...x, galtype: e.target.value } : x
                        )
                      )
                    }
                    placeholder="선택 · 예: mgallery/"
                    className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-emerald-400/70"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300">갤러리ID</label>
                  <input
                    value={d.galid}
                    onChange={(e) =>
                      setDrafts((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, galid: e.target.value } : x))
                      )
                    }
                    placeholder="예: nextlegend"
                    className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-emerald-400/70"
                  />
                </div>

                <div className="sm:col-span-3 flex justify-end gap-2">
                  <button
                    onClick={() =>
                      setDrafts((prev) => prev.filter((_, i) => i !== idx))
                    }
                    disabled={drafts.length <= 1}
                    className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-100 hover:bg-zinc-800/80 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    제거
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              onClick={() =>
                setDrafts((prev) => [
                  ...prev,
                  { pjSeq: "", galtype: DEFAULT_GALTYPE, galid: "" },
                ])
              }
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800/80"
            >
              + 추가
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "등록 중..." : "등록"}
            </button>
          </div>

          <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
            <div className="text-xs font-semibold text-zinc-200">등록 전 → 후 (diff)</div>
            <div className="mt-1 text-xs text-zinc-400">
              유효 입력{" "}
              <span className="text-zinc-200">{draftDiff.totalValid}</span>건 / 신규{" "}
              <span className="text-zinc-200">{draftDiff.willAdd.length}</span>건 / 이미
              존재{" "}
              <span className="text-zinc-200">{draftDiff.already.length}</span>건
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {draftDiff.willAdd.slice(0, 6).map((k) => (
                <span
                  key={`a-${k}`}
                  className="rounded-full border border-emerald-400/20 bg-emerald-950/30 px-2 py-0.5 text-[11px] text-emerald-200"
                >
                  +{k.split("||").slice(1).join(" ")}
                </span>
              ))}
              {draftDiff.already.slice(0, 6).map((k) => (
                <span
                  key={`e-${k}`}
                  className="rounded-full border border-zinc-400/20 bg-zinc-950/30 px-2 py-0.5 text-[11px] text-zinc-300"
                >
                  ={k.split("||").slice(1).join(" ")}
                </span>
              ))}
              {draftDiff.totalValid === 0 ? (
                <span className="text-xs text-zinc-500">유효한 입력이 없습니다.</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-zinc-100">갤러리 설정된 프로그램</div>
            <div className="flex items-center gap-2">
              <input
                value={listQ}
                onChange={(e) => setListQ(e.target.value)}
                placeholder="프로그램명/번호/갤러리 검색"
                className="w-56 rounded-lg border border-zinc-700 bg-zinc-950/70 px-3 py-1.5 text-xs text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-emerald-400/70"
              />
              <button
                onClick={refresh}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-100 hover:bg-zinc-800/80"
              >
                새로고침
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-zinc-400">불러오는 중...</div>
          ) : filteredRows.length === 0 ? (
            <div className="text-sm text-zinc-400">등록된 항목이 없습니다.</div>
          ) : (
            <div className="max-h-[520px] overflow-auto rounded-lg border border-zinc-800">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="sticky top-0 bg-zinc-950">
                  <tr className="text-xs text-zinc-400">
                    <th className="w-24 px-3 py-2">프로그램번호</th>
                    <th className="w-56 px-3 py-2">프로그램명</th>
                    <th className="w-28 px-3 py-2">종류</th>
                    <th className="px-3 py-2">갤러리ID</th>
                    <th className="w-24 px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r, idx) => (
                    <tr
                      key={`${r.pj}-${r.galtype ?? ""}-${r.galid}-${idx}`}
                      className="border-t border-white/10"
                    >
                      <td className="px-3 py-2 font-mono text-xs text-zinc-300">
                        {r.pj ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-zinc-100">
                        <div className="truncate" title={r.pjname ?? undefined}>
                          {r.pjname ?? "-"}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-zinc-200">{r.galtype ?? "-"}</td>
                      <td className="px-3 py-2 text-zinc-200 overflow-hidden">
                        <div className="truncate" title={r.galid ?? undefined}>
                          {r.galid ?? "-"}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button
                          onClick={() => void onDelete(r)}
                          className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-100 hover:bg-zinc-800/80"
                        >
                          삭제
                        </button>
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

