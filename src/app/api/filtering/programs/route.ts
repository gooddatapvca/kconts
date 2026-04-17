import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Platform = "all" | "tv_ott" | "web_show";
type Drama = "all" | "drama" | "non_drama";

/**
 * raw_contents.conts_status = 1 인 건만 project 와 INNER JOIN 후 프로그램별 건수,
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
            COUNT(rc.conts_seq)::bigint AS doc_count
          FROM project p
          INNER JOIN raw_contents rc
            ON rc.pj_seq::bigint = p.pj_seq
            AND rc.conts_status = 1
          WHERE COALESCE(p.project_status, 1) = 1
            ${dramaSql}
            ${weekdaySql}
          GROUP BY p.pj_seq, p.pjname
          ORDER BY doc_count DESC, p.pj_seq DESC
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
              COUNT(rc.conts_seq)::bigint AS doc_count
            FROM project p
            INNER JOIN pclass pc
              ON pc.class_id = p.class_id
              AND pc.par_class_id IN ('cl001', 'cl002', 'cl003', 'cl900')
            INNER JOIN raw_contents rc
              ON rc.pj_seq::bigint = p.pj_seq
              AND rc.conts_status = 1
            WHERE COALESCE(p.project_status, 1) = 1
              ${dramaSql}
              ${weekdaySql}
            GROUP BY p.pj_seq, p.pjname
            ORDER BY doc_count DESC, p.pj_seq DESC
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
              COUNT(rc.conts_seq)::bigint AS doc_count
            FROM project p
            INNER JOIN pclass pc
              ON pc.class_id = p.class_id
              AND pc.par_class_id = 'cl901'
            INNER JOIN raw_contents rc
              ON rc.pj_seq::bigint = p.pj_seq
              AND rc.conts_status = 1
            WHERE COALESCE(p.project_status, 1) = 1
              ${dramaSql}
              ${weekdaySql}
            GROUP BY p.pj_seq, p.pjname
            ORDER BY doc_count DESC, p.pj_seq DESC
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
