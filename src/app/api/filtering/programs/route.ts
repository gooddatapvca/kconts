import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Platform = "all" | "tv_ott" | "web_show";
type Drama = "all" | "drama" | "non_drama";

/**
 * raw_contents에서 conts_status=1만 먼저 pj_seq별 집계한 뒤 project(및 pclass)와 조인,
 * 건수 많은 순 정렬.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const platform = (url.searchParams.get("platform") ?? "all") as Platform;
  const drama = (url.searchParams.get("drama") ?? "all") as Drama;
  const weekdayRaw = url.searchParams.get("weekday");
  const weekday =
    weekdayRaw != null && weekdayRaw !== ""
      ? Number.parseInt(weekdayRaw, 10)
      : NaN;
  const hasWeekday = Number.isInteger(weekday) && weekday >= 1 && weekday <= 7;

  const dramaSql =
    drama === "drama"
      ? Prisma.sql`AND p.cat_id = 'cat001'`
      : drama === "non_drama"
        ? Prisma.sql`AND (p.cat_id IS NULL OR p.cat_id <> 'cat001')`
        : Prisma.empty;

  const weekdaySql = hasWeekday
    ? Prisma.sql`AND ${weekday} = ANY(p.service_day)`
    : Prisma.empty;

  const rows =
    platform === "all"
      ? await prisma.$queryRaw<
          Array<{
            pj_seq: bigint | number | string;
            pjname: string;
            doc_count: bigint | number | string;
          }>
        >(Prisma.sql`
          SELECT
            p.pj_seq,
            p.pjname,
            rc.doc_count
          FROM (
            SELECT
              rc.pj_seq::bigint AS pj_seq,
              COUNT(*)::bigint AS doc_count
            FROM raw_contents rc
            WHERE rc.conts_status = 1
            GROUP BY rc.pj_seq::bigint
          ) rc
          JOIN project p ON p.pj_seq = rc.pj_seq
          WHERE (p.project_status = 1 OR p.project_status IS NULL)
            ${dramaSql}
            ${weekdaySql}
          ORDER BY rc.doc_count DESC, p.pj_seq DESC
          LIMIT 500
        `)
      : platform === "tv_ott"
        ? await prisma.$queryRaw<
            Array<{
              pj_seq: bigint | number | string;
              pjname: string;
              doc_count: bigint | number | string;
            }>
          >(Prisma.sql`
            SELECT
              p.pj_seq,
              p.pjname,
              rc.doc_count
            FROM (
              SELECT
                rc.pj_seq::bigint AS pj_seq,
                COUNT(*)::bigint AS doc_count
              FROM raw_contents rc
              WHERE rc.conts_status = 1
              GROUP BY rc.pj_seq::bigint
            ) rc
            JOIN project p ON p.pj_seq = rc.pj_seq
            JOIN pclass pc ON pc.class_id = p.class_id
            WHERE pc.par_class_id IN ('cl001', 'cl002', 'cl003', 'cl900')
              AND (p.project_status = 1 OR p.project_status IS NULL)
              ${dramaSql}
              ${weekdaySql}
            ORDER BY rc.doc_count DESC, p.pj_seq DESC
            LIMIT 500
          `)
        : await prisma.$queryRaw<
            Array<{
              pj_seq: bigint | number | string;
              pjname: string;
              doc_count: bigint | number | string;
            }>
          >(Prisma.sql`
            SELECT
              p.pj_seq,
              p.pjname,
              rc.doc_count
            FROM (
              SELECT
                rc.pj_seq::bigint AS pj_seq,
                COUNT(*)::bigint AS doc_count
              FROM raw_contents rc
              WHERE rc.conts_status = 1
              GROUP BY rc.pj_seq::bigint
            ) rc
            JOIN project p ON p.pj_seq = rc.pj_seq
            JOIN pclass pc ON pc.class_id = p.class_id
            WHERE pc.par_class_id = 'cl901'
              AND (p.project_status = 1 OR p.project_status IS NULL)
              ${dramaSql}
              ${weekdaySql}
            ORDER BY rc.doc_count DESC, p.pj_seq DESC
            LIMIT 500
          `);

  return NextResponse.json({
    ok: true,
    items: rows.map((r, i) => ({
      rank: i + 1,
      pj_seq: String(r.pj_seq),
      pjname: r.pjname,
      doc_count: Number(r.doc_count),
    })),
  });
}
