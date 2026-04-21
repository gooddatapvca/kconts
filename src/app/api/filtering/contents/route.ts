import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { channelBucketCase, parseBucket } from "@/lib/filteringChannelBucket";

function parsePjSeqInt(raw: string | null): number | null {
  if (raw == null || raw.trim() === "") return null;
  const t = raw.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = parseInt(t, 10);
  if (!Number.isSafeInteger(n)) return null;
  return n;
}

type SearchField = "title" | "body" | "title_body";
type MatchMode = "like" | "not";
type StatusFilter = "normal" | "deleted" | "all";
type SortKey = "rp_desc" | "v_desc" | "wdate_desc" | "wdate_asc";

function parseSearchField(raw: string | null): SearchField {
  if (raw === "title" || raw === "body" || raw === "title_body") return raw;
  return "title_body";
}

function parseMatchMode(raw: string | null): MatchMode {
  if (raw === "not") return "not";
  return "like";
}

function parseStatusFilter(raw: string | null): StatusFilter {
  if (raw === "deleted") return "deleted";
  if (raw === "all") return "all";
  return "normal";
}

function parseSortKey(raw: string | null): SortKey {
  if (raw === "rp_desc" || raw === "v_desc" || raw === "wdate_desc" || raw === "wdate_asc") {
    return raw;
  }
  return "wdate_desc";
}

/**
 * 선택 프로그램의 수집문서 — conts_status=1, project INNER JOIN, 채널 버킷·페이징
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const pjSeq = parsePjSeqInt(url.searchParams.get("pj_seq"));
  const bucket = parseBucket(url.searchParams.get("bucket"));
  const q = (url.searchParams.get("q") ?? "").trim();
  const searchField = parseSearchField(url.searchParams.get("searchField"));
  const matchMode = parseMatchMode(url.searchParams.get("matchMode"));
  const status = parseStatusFilter(url.searchParams.get("status"));
  const sort = parseSortKey(url.searchParams.get("sort"));
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSizeRaw = Number.parseInt(url.searchParams.get("pageSize") ?? "20", 10) || 20;
  const pageSize = Math.min(500, Math.max(5, pageSizeRaw));
  const offset = (page - 1) * pageSize;

  if (pjSeq == null) {
    return NextResponse.json({ ok: false, error: "pj_seq가 필요합니다." }, { status: 400 });
  }

  const bucketWhere =
    bucket === "all"
      ? Prisma.empty
      : Prisma.sql`AND (${channelBucketCase}) = ${bucket}`;
  const statusWhere =
    status === "all"
      ? Prisma.empty
      : status === "deleted"
        ? Prisma.sql`AND rc.conts_status = 0`
        : Prisma.sql`AND rc.conts_status = 1`;
  const orderBySql =
    sort === "rp_desc"
      ? Prisma.sql`COALESCE(rc.rp_count, 0) DESC, rc.conts_seq DESC`
      : sort === "v_desc"
        ? Prisma.sql`COALESCE(rc.v_count, 0) DESC, rc.conts_seq DESC`
        : sort === "wdate_asc"
          ? Prisma.sql`rc.wdate ASC NULLS LAST, rc.conts_seq DESC`
          : Prisma.sql`rc.wdate DESC NULLS LAST, rc.conts_seq DESC`;

  const qPattern = `%${q}%`;
  const searchTargetExpr =
    searchField === "title"
      ? Prisma.sql`COALESCE(rc.title, '')`
      : searchField === "body"
        ? Prisma.sql`COALESCE(rc.body, '')`
        : Prisma.sql`(COALESCE(rc.title, '') || ' ' || COALESCE(rc.body, ''))`;
  const searchWhere =
    q === ""
      ? Prisma.empty
      : matchMode === "not"
        ? Prisma.sql`AND NOT (${searchTargetExpr} ILIKE ${qPattern})`
        : Prisma.sql`AND ${searchTargetExpr} ILIKE ${qPattern}`;

  const countRows = await prisma.$queryRaw<Array<{ c: bigint | number | string }>>(
    Prisma.sql`
      SELECT COUNT(*)::bigint AS c
      FROM raw_contents rc
      INNER JOIN project p ON p.pj_seq = rc.pj_seq::bigint
      LEFT JOIN site s ON s.site_id = rc.site_id
      LEFT JOIN channel ch ON ch.chan_id = s.chan_id
      WHERE rc.pj_seq = ${pjSeq}
        ${statusWhere}
        ${bucketWhere}
        ${searchWhere}
    `
  );

  const total = Number(countRows[0]?.c ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const rows = await prisma.$queryRaw<
    Array<{
      conts_seq: number;
      pj_seq: number;
      site_id: string | null;
      site_name: string | null;
      title: string | null;
      writer: string | null;
      wdate: Date | null;
      cwdate: Date | null;
      conts_status: number | null;
      rp_count: number | null;
      v_count: number | null;
      origin_link: string | null;
    }>
  >(
    Prisma.sql`
      SELECT
        rc.conts_seq,
        rc.pj_seq,
        rc.site_id,
        s.site_name,
        rc.title,
        rc.writer,
        rc.wdate,
        rc.cwdate,
        rc.conts_status,
        rc.rp_count,
        rc.v_count,
        rc.origin_link
      FROM raw_contents rc
      INNER JOIN project p ON p.pj_seq = rc.pj_seq::bigint
      LEFT JOIN site s ON s.site_id = rc.site_id
      LEFT JOIN channel ch ON ch.chan_id = s.chan_id
      WHERE rc.pj_seq = ${pjSeq}
        ${statusWhere}
        ${bucketWhere}
        ${searchWhere}
      ORDER BY ${orderBySql}
      LIMIT ${pageSize}
      OFFSET ${offset}
    `
  );

  const iso = (d: Date | null) =>
    d instanceof Date ? d.toISOString() : d == null ? null : String(d);

  return NextResponse.json({
    ok: true,
    bucket,
    q,
    searchField,
    matchMode,
    status,
    sort,
    page,
    pageSize,
    total,
    totalPages,
    items: rows.map((r) => ({
      conts_seq: r.conts_seq,
      pj_seq: r.pj_seq,
      site_id: r.site_id,
      site_name: r.site_name,
      title: r.title,
      writer: r.writer,
      wdate: iso(r.wdate),
      cwdate: iso(r.cwdate),
      conts_status: r.conts_status,
      rp_count: r.rp_count,
      v_count: r.v_count,
      origin_link: r.origin_link,
    })),
  });
}

type PatchBody = {
  action?: string;
  conts_seqs?: unknown;
};

/**
 * 체크한 글 일괄 삭제(conts_status=0) · 복구(=9)
 */
export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => null)) as PatchBody | null;
  const action = body?.action;
  const rawSeqs = body?.conts_seqs;

  if (action !== "delete" && action !== "restore") {
    return NextResponse.json({ ok: false, error: "action은 delete 또는 restore 입니다." }, { status: 400 });
  }

  const seqs = Array.isArray(rawSeqs)
    ? rawSeqs
        .map((x) => (typeof x === "number" ? x : typeof x === "string" ? parseInt(x, 10) : NaN))
        .filter((n) => Number.isInteger(n) && n > 0)
    : [];

  if (seqs.length === 0) {
    return NextResponse.json({ ok: false, error: "conts_seq를 한 건 이상 선택하세요." }, { status: 400 });
  }

  const nextStatus = action === "delete" ? 0 : 9;

  const n = await prisma.$executeRaw(
    Prisma.sql`
      UPDATE raw_contents
      SET conts_status = ${nextStatus}
      WHERE conts_seq IN (${Prisma.join(seqs)})
    `
  );

  const updated = typeof n === "number" ? n : 0;
  return NextResponse.json({ ok: true, updated, action, conts_status: nextStatus });
}
