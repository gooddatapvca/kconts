import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { channelBucketCase } from "@/lib/filteringChannelBucket";

function parsePjSeqInt(raw: string | null): number | null {
  if (raw == null || raw.trim() === "") return null;
  const t = raw.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = parseInt(t, 10);
  if (!Number.isSafeInteger(n)) return null;
  return n;
}

/**
 * 프로그램별 채널(매체) 집계 — 뉴스 / VON / VD / SNS / 전체
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const pjSeq = parsePjSeqInt(url.searchParams.get("pj_seq"));

  if (pjSeq == null) {
    return NextResponse.json({ ok: false, error: "pj_seq가 필요합니다." }, { status: 400 });
  }

  const rows = await prisma.$queryRaw<
    Array<{
      total: bigint | number | string;
      news: bigint | number | string;
      von: bigint | number | string;
      vd: bigint | number | string;
      sns: bigint | number | string;
    }>
  >(
    Prisma.sql`
      SELECT
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE (${channelBucketCase}) = 'news')::bigint AS news,
        COUNT(*) FILTER (WHERE (${channelBucketCase}) = 'von')::bigint AS von,
        COUNT(*) FILTER (WHERE (${channelBucketCase}) = 'vd')::bigint AS vd,
        COUNT(*) FILTER (WHERE (${channelBucketCase}) = 'sns')::bigint AS sns
      FROM raw_contents rc
      INNER JOIN project p ON p.pj_seq = rc.pj_seq::bigint
      LEFT JOIN site s ON s.site_id = rc.site_id
      LEFT JOIN channel ch ON ch.chan_id = s.chan_id
      WHERE rc.pj_seq = ${pjSeq}
        AND rc.conts_status = 1
    `
  );

  const r = rows[0];
  if (!r) {
    return NextResponse.json({
      ok: true,
      total: 0,
      news: 0,
      von: 0,
      vd: 0,
      sns: 0,
    });
  }

  return NextResponse.json({
    ok: true,
    total: Number(r.total),
    news: Number(r.news),
    von: Number(r.von),
    vd: Number(r.vd),
    sns: Number(r.sns),
  });
}
