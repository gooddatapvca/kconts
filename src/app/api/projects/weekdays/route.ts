import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.$queryRaw<
    Array<{ pj_seq: bigint | number | string; pjname: string; service_day: number[] | null }>
  >(
    Prisma.sql`
      SELECT pj_seq, pjname, service_day
      FROM project
      WHERE COALESCE(project_status, 1) = 1
      ORDER BY pj_seq DESC
      LIMIT 500
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

  const arr =
    days.length === 0
      ? Prisma.sql`'{}'::int[]`
      : Prisma.sql`ARRAY[${Prisma.join(days.map((d) => Prisma.sql`${d}`))}]::int[]`;

  await prisma.$executeRaw(
    Prisma.sql`UPDATE project SET service_day = ${arr} WHERE pj_seq = ${pjSeq}`
  );

  return NextResponse.json({ ok: true, days });
}

