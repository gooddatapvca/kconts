import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * 글 상세(제목 클릭 시 펼침) — 본문·프로그램명·사이트 등
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("conts_seq");
  const conts_seq =
    raw != null && /^\d+$/.test(raw.trim()) ? parseInt(raw.trim(), 10) : NaN;

  if (!Number.isInteger(conts_seq) || conts_seq <= 0) {
    return NextResponse.json({ ok: false, error: "conts_seq가 필요합니다." }, { status: 400 });
  }

  const rows = await prisma.$queryRaw<
    Array<{
      conts_seq: number;
      pj_seq: number;
      site_id: string | null;
      site_name: string | null;
      title: string | null;
      body: string | null;
      writer: string | null;
      wdate: Date | null;
      cwdate: Date | null;
      conts_status: number | null;
      rp_count: number | null;
      v_count: number | null;
      origin_link: string | null;
      origin: string | null;
      pjname: string;
    }>
  >(
    Prisma.sql`
      SELECT
        rc.conts_seq,
        rc.pj_seq,
        rc.site_id,
        s.site_name,
        rc.title,
        rc.body,
        rc.writer,
        rc.wdate,
        rc.cwdate,
        rc.conts_status,
        rc.rp_count,
        rc.v_count,
        rc.origin_link,
        rc.origin,
        p.pjname
      FROM raw_contents rc
      INNER JOIN project p ON p.pj_seq = rc.pj_seq::bigint
      LEFT JOIN site s ON s.site_id = rc.site_id
      WHERE rc.conts_seq = ${conts_seq}
      LIMIT 1
    `
  );

  const r = rows[0];
  if (!r) {
    return NextResponse.json({ ok: false, error: "문서를 찾을 수 없습니다." }, { status: 404 });
  }

  const iso = (d: Date | null) =>
    d instanceof Date ? d.toISOString() : d == null ? null : String(d);

  return NextResponse.json({
    ok: true,
    item: {
      conts_seq: r.conts_seq,
      pj_seq: r.pj_seq,
      site_id: r.site_id,
      site_name: r.site_name,
      title: r.title,
      body: r.body,
      writer: r.writer,
      wdate: iso(r.wdate),
      cwdate: iso(r.cwdate),
      conts_status: r.conts_status,
      rp_count: r.rp_count,
      v_count: r.v_count,
      origin_link: r.origin_link,
      origin: r.origin,
      pjname: r.pjname,
    },
  });
}
