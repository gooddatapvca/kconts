import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function parsePjSeqInt(raw: string | null): number | null {
  if (raw == null || raw.trim() === "") return null;
  const t = raw.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = parseInt(t, 10);
  if (!Number.isSafeInteger(n)) return null;
  return n;
}

/**
 * 선택한 프로그램의 수집문서 목록(좌측 패널)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const pjSeq = parsePjSeqInt(url.searchParams.get("pj_seq"));

  if (pjSeq == null) {
    return NextResponse.json({ ok: false, error: "pj_seq가 필요합니다." }, { status: 400 });
  }

  const rows = await prisma.$queryRaw<
    Array<{
      conts_seq: number;
      pj_seq: number;
      site_id: string | null;
      site_name: string | null;
      title: string | null;
      writer: string | null;
      wdate: Date | null;
      cwdate: Date | null;
      conts_status: number | null;
      rp_count: number | null;
      v_count: number | null;
      origin_link: string | null;
    }>
  >(
    Prisma.sql`
      SELECT
        rc.conts_seq,
        rc.pj_seq,
        rc.site_id,
        s.site_name,
        rc.title,
        rc.writer,
        rc.wdate,
        rc.cwdate,
        rc.conts_status,
        rc.rp_count,
        rc.v_count,
        rc.origin_link
      FROM raw_contents rc
      LEFT JOIN site s ON s.site_id = rc.site_id
      WHERE rc.pj_seq = ${pjSeq}
      ORDER BY rc.conts_seq DESC
      LIMIT 300
    `
  );

  const iso = (d: Date | null) =>
    d instanceof Date ? d.toISOString() : d == null ? null : String(d);

  return NextResponse.json({
    ok: true,
    items: rows.map((r) => ({
      conts_seq: r.conts_seq,
      pj_seq: r.pj_seq,
      site_id: r.site_id,
      site_name: r.site_name,
      title: r.title,
      writer: r.writer,
      wdate: iso(r.wdate),
      cwdate: iso(r.cwdate),
      conts_status: r.conts_status,
      rp_count: r.rp_count,
      v_count: r.v_count,
      origin_link: r.origin_link,
    })),
  });
}

type PatchBody = {
  action?: string;
  conts_seqs?: unknown;
};

/**
 * 체크한 글 일괄 삭제(conts_status=0) · 복구(=9)
 */
export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => null)) as PatchBody | null;
  const action = body?.action;
  const rawSeqs = body?.conts_seqs;

  if (action !== "delete" && action !== "restore") {
    return NextResponse.json({ ok: false, error: "action은 delete 또는 restore 입니다." }, { status: 400 });
  }

  const seqs = Array.isArray(rawSeqs)
    ? rawSeqs
        .map((x) => (typeof x === "number" ? x : typeof x === "string" ? parseInt(x, 10) : NaN))
        .filter((n) => Number.isInteger(n) && n > 0)
    : [];

  if (seqs.length === 0) {
    return NextResponse.json({ ok: false, error: "conts_seq를 한 건 이상 선택하세요." }, { status: 400 });
  }

  const nextStatus = action === "delete" ? 0 : 9;

  const n = await prisma.$executeRaw(
    Prisma.sql`
      UPDATE raw_contents
      SET conts_status = ${nextStatus}
      WHERE conts_seq IN (${Prisma.join(seqs)})
    `
  );

  const updated = typeof n === "number" ? n : 0;
  return NextResponse.json({ ok: true, updated, action, conts_status: nextStatus });
}
