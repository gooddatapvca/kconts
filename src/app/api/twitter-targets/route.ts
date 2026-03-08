import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.$queryRaw<
    Array<{ pj_seq: bigint | number | string | null }>
  >(Prisma.sql`SELECT pj_seq FROM xxx_pjlist1 ORDER BY pj_seq ASC`);

  return NextResponse.json({
    items: rows
      .map((r) => (r.pj_seq == null ? null : String(r.pj_seq)))
      .filter((v): v is string => Boolean(v)),
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { pjSeqs?: Array<string | number> }
    | null;

  const raw = body?.pjSeqs ?? [];
  const pjSeqs = Array.from(
    new Set(
      raw
        .map((v) => String(v).trim())
        .filter((v) => /^\d+$/.test(v))
    )
  ).map((s) => BigInt(s));

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`TRUNCATE TABLE xxx_pjlist1`);
    if (pjSeqs.length) {
      const values = pjSeqs.map((id) => Prisma.sql`(${id})`);
      await tx.$executeRaw(
        Prisma.sql`INSERT INTO xxx_pjlist1 (pj_seq) VALUES ${Prisma.join(values)}`
      );
    }
  });

  const rows = await prisma.$queryRaw<
    Array<{ pj_seq: bigint | number | string | null }>
  >(Prisma.sql`SELECT pj_seq FROM xxx_pjlist1 ORDER BY pj_seq ASC`);

  return NextResponse.json({
    ok: true,
    items: rows
      .map((r) => (r.pj_seq == null ? null : String(r.pj_seq)))
      .filter((v): v is string => Boolean(v)),
  });
}

