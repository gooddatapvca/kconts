import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  const rows = await prisma.$queryRaw<
    Array<{
      pj_seq: bigint | number | string;
      pjname: string;
      class_id: string | null;
      class_name: string | null;
      service_day: number[] | null;
    }>
  >(
    q
      ? Prisma.sql`
        SELECT
          p.pj_seq,
          p.pjname,
          p.class_id,
          pc.class_name,
          p.service_day
        FROM project p
        LEFT JOIN pclass pc ON pc.class_id = p.class_id
        WHERE COALESCE(p.project_status, 1) = 1
          AND (p.pjname ILIKE ${"%" + q + "%"} OR (p.pj_seq)::text = ${q})
        ORDER BY p.pj_seq DESC
        LIMIT 200
      `
      : Prisma.sql`
        SELECT
          p.pj_seq,
          p.pjname,
          p.class_id,
          pc.class_name,
          p.service_day
        FROM project p
        LEFT JOIN pclass pc ON pc.class_id = p.class_id
        WHERE COALESCE(p.project_status, 1) = 1
        ORDER BY p.pj_seq DESC
        LIMIT 200
      `
  );

  return NextResponse.json({
    items: rows.map((r) => ({
      pj_seq: String(r.pj_seq),
      pjname: r.pjname,
      class_id: r.class_id,
      class_name: r.class_name,
      service_day: r.service_day ?? [],
    })),
  });
}

