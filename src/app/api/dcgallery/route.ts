import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.$queryRaw<
    Array<{
      pj: string | null;
      pjname: string | null;
      galtype: string | null;
      galid: string | null;
      status: number | null;
    }>
  >(
    Prisma.sql`
      SELECT
        d.pj,
        p.pjname,
        d.galtype,
        d.galid,
        d.status
      FROM dcgallery d
      LEFT JOIN project p ON (p.pj_seq)::text = d.pj
      WHERE COALESCE(d.status, 1) = 1
      ORDER BY d.pj ASC NULLS LAST, d.galtype ASC NULLS LAST, d.galid ASC NULLS LAST
      LIMIT 1000
    `
  );

  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | {
        items?: Array<{
          pjSeq?: string | number;
          galtype?: string;
          galid?: string;
        }>;
      }
    | null;

  const items = (body?.items ?? [])
    .map((it) => ({
      pj: String(it.pjSeq ?? "").trim(),
      galtype: String(it.galtype ?? "").trim(),
      galid: String(it.galid ?? "").trim(),
    }))
    .filter((it) => /^\d+$/.test(it.pj) && it.galtype && it.galid);

  const dedupKey = (it: (typeof items)[number]) =>
    `${it.pj}||${it.galtype}||${it.galid}`;
  const dedup = Array.from(new Map(items.map((it) => [dedupKey(it), it])).values());

  await prisma.$transaction(async (tx) => {
    for (const it of dedup) {
      await tx.$executeRaw(
        Prisma.sql`
          DELETE FROM dcgallery
          WHERE pj = ${it.pj} AND galtype = ${it.galtype} AND galid = ${it.galid}
        `
      );
      await tx.$executeRaw(
        Prisma.sql`
          INSERT INTO dcgallery (pj, galtype, galid, status)
          VALUES (${it.pj}, ${it.galtype}, ${it.galid}, 1)
        `
      );
    }
  });

  return NextResponse.json({ ok: true, count: dedup.length });
}

export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { pj?: string | number; galtype?: string; galid?: string }
    | null;

  const pj = String(body?.pj ?? "").trim();
  const galtype = String(body?.galtype ?? "").trim();
  const galid = String(body?.galid ?? "").trim();

  if (!/^\d+$/.test(pj) || !galtype || !galid) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }

  await prisma.$executeRaw(
    Prisma.sql`DELETE FROM dcgallery WHERE pj = ${pj} AND galtype = ${galtype} AND galid = ${galid}`
  );

  return NextResponse.json({ ok: true });
}

