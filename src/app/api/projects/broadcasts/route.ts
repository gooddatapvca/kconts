import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.$queryRaw<
    Array<{
      pj_seq: bigint | number | string;
      pjname: string;
      base_class: string | null;
      extra_classes: string[] | null;
      group_names: string[] | null;
    }>
  >(
    Prisma.sql`
      SELECT
        p.pj_seq,
        p.pjname,
        pc.class_name AS base_class,
        ARRAY_REMOVE(
          ARRAY_AGG(DISTINCT COALESCE(pc2.class_name, g.class_id)),
          NULL
        ) AS extra_classes,
        ARRAY_REMOVE(
          ARRAY_AGG(DISTINCT COALESCE(pcg.class_name, g.grp_class_id)),
          NULL
        ) AS group_names
      FROM project p
      INNER JOIN grp_pclass g ON g.pj_seq = p.pj_seq
      INNER JOIN pclass pc ON pc.class_id = p.class_id
      INNER JOIN pclass pc2 ON pc2.class_id = g.class_id
      LEFT JOIN pclass pcg ON pcg.class_id = g.grp_class_id
      WHERE COALESCE(p.project_status, 1) = 1
      GROUP BY p.pj_seq, p.pjname, pc.class_name
      ORDER BY p.pj_seq DESC
      LIMIT 500
    `
  );

  return NextResponse.json({
    items: rows.map((r) => ({
      pj_seq: String(r.pj_seq),
      pjname: r.pjname,
      base_class: r.base_class,
      extra_classes: r.extra_classes ?? [],
      group_names: r.group_names ?? [],
    })),
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { pjSeq?: string | number; groupName?: string; classIds?: string[] }
    | null;

  const pjSeqRaw = String(body?.pjSeq ?? "").trim();
  if (!/^\d+$/.test(pjSeqRaw)) {
    return NextResponse.json({ ok: false, error: "Invalid pjSeq" }, { status: 400 });
  }

  const pjSeq = BigInt(pjSeqRaw);
  const groupName = (body?.groupName ?? "").trim() || null;
  const classIds = (body?.classIds ?? [])
    .map((s) => String(s).trim())
    .filter(Boolean);

  // best-effort: remove base class_id from extras to avoid duplicates
  const base = await prisma.$queryRaw<Array<{ class_id: string | null }>>(
    Prisma.sql`SELECT class_id FROM project WHERE pj_seq = ${pjSeq} LIMIT 1`
  );
  const baseClassId = base[0]?.class_id ?? null;
  const filtered = Array.from(new Set(classIds)).filter(
    (id) => id && id !== baseClassId
  );

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`DELETE FROM grp_pclass WHERE pj_seq = ${pjSeq}`);
    if (filtered.length) {
      const values = filtered.map((cid) => Prisma.sql`(${cid}, ${baseClassId}, ${pjSeq})`);
      await tx.$executeRaw(
        Prisma.sql`
          INSERT INTO grp_pclass (class_id, grp_class_id, pj_seq)
          VALUES ${Prisma.join(values)}
        `
      );
    }
  });

  return NextResponse.json({ ok: true });
}

