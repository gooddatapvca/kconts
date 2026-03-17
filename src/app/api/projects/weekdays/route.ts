import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.$queryRaw<
    Array<{ pj_seq: bigint | number | string; pjname: string; service_day: number[] | null }>
  >(
    Prisma.sql`
      SELECT
            psm.pj_seq,
            p.pjname,
            ARRAY_AGG(psm.day_val ORDER BY psm.idx)::int[] AS service_day
        FROM (
            SELECT
                pj_seq,
                gs.idx,
                MAX(COALESCE(service_day[gs.idx], 0)) AS day_val
            FROM project_sday
            CROSS JOIN generate_series(1, 7) AS gs(idx)
            GROUP BY pj_seq, gs.idx
        ) psm
        JOIN project p
            ON p.pj_seq = psm.pj_seq
        WHERE COALESCE(p.project_status, 1) = 1
        GROUP BY psm.pj_seq, p.pjname
        ORDER BY psm.pj_seq DESC
        LIMIT 500;
    `
  );

  return NextResponse.json({
    items: rows.map((r) => ({
      pj_seq: String(r.pj_seq),
      pjname: r.pjname,
      service_day: r.service_day ?? [],
    })),
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { pjSeq?: string | number; days?: number[] }
    | null;

  const pjSeqRaw = String(body?.pjSeq ?? "").trim();
  if (!/^\d+$/.test(pjSeqRaw)) {
    return NextResponse.json({ ok: false, error: "Invalid pjSeq" }, { status: 400 });
  }
  const pjSeq = BigInt(pjSeqRaw);

  const daysRaw = Array.isArray(body?.days) ? body?.days : [];
  const days = Array.from(
    new Set(
      daysRaw
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 7)
    )
  ).sort((a, b) => a - b);

  // 선택된 요일을 project_sday에 "요일당 1행"으로 저장한다.
  // 예: [1,2] -> {1,0,0,0,0,0,0}, {0,1,0,0,0,0,0}
  const rowsToInsert = days.map((d) => {
    const flags = Array.from({ length: 7 }, (_, i) => (i + 1 === d ? 1 : 0));
    return Prisma.sql`(${pjSeq}, ARRAY[${Prisma.join(flags.map((n) => Prisma.sql`${n}`))}]::int[])`;
  });

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`DELETE FROM project_sday WHERE pj_seq = ${pjSeq}`);
    if (rowsToInsert.length) {
      await tx.$executeRaw(
        Prisma.sql`
          INSERT INTO project_sday (pj_seq, service_day)
          VALUES ${Prisma.join(rowsToInsert)}
        `
      );
    }
  });

  return NextResponse.json({ ok: true, days });
}

