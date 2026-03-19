import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * 미사용(top_status=0) 토픽 목록·복구
 * - project.pj_seq(BigInt) ↔ topic.pj_seq(Int) 비교는 PG에서 자동 승격
 * - topictype.topic_type = topic.topic_type
 */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  if (!q) {
    return NextResponse.json(
      { ok: false, error: "프로그램명(일부)을 입력하세요." },
      { status: 400 }
    );
  }

  const pattern = `%${q}%`;

  const rows = await prisma.$queryRaw<
    Array<{
      top_seq: number;
      pj_seq: number;
      top_name: string;
      top_status: number | null;
      topic_type: string;
      person_seq: bigint | null;
      par_top_seq: number;
      pjname: string;
      topic_type_name: string | null;
    }>
  >(
    Prisma.sql`
      SELECT
        t.top_seq,
        t.pj_seq,
        t.top_name,
        t.top_status,
        t.topic_type,
        t.person_seq,
        t.par_top_seq,
        p.pjname,
        tt.topic_type_name
      FROM topic t
      INNER JOIN project p ON p.pj_seq = t.pj_seq
      LEFT JOIN topictype tt ON tt.topic_type = t.topic_type
      WHERE t.top_status = 0
        AND p.pjname ILIKE ${pattern}
      ORDER BY t.top_seq DESC
      LIMIT 100
    `
  );

  return NextResponse.json({
    ok: true,
    items: rows.map((r) => ({
      top_seq: r.top_seq,
      pj_seq: r.pj_seq,
      top_name: r.top_name,
      top_status: r.top_status,
      topic_type: r.topic_type,
      person_seq: r.person_seq != null ? String(r.person_seq) : null,
      par_top_seq: r.par_top_seq,
      pjname: r.pjname,
      topic_type_name: r.topic_type_name,
    })),
  });
}

export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { top_seq?: number | string }
    | null;

  const raw = body?.top_seq;
  const top_seq =
    typeof raw === "string" ? parseInt(raw, 10) : typeof raw === "number" ? raw : NaN;

  if (!Number.isInteger(top_seq) || top_seq <= 0) {
    return NextResponse.json({ ok: false, error: "유효하지 않은 top_seq" }, { status: 400 });
  }

  const n = await prisma.$executeRaw(
    Prisma.sql`
      UPDATE topic
      SET top_status = 1
      WHERE top_seq = ${top_seq}
        AND top_status = 0
    `
  );

  const updated = typeof n === "number" ? n : 0;
  if (updated === 0) {
    return NextResponse.json(
      { ok: false, error: "복구할 수 없습니다. 이미 사용 중이거나 존재하지 않는 토픽입니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, top_seq });
}
