import { Prisma } from "@prisma/client";

export type ChannelBucket = "news" | "von" | "vd" | "sns";

const BUCKETS: ChannelBucket[] = ["news", "von", "vd", "sns"];

export function parseBucket(raw: string | null): ChannelBucket | "all" {
  if (raw == null || raw === "" || raw === "all") return "all";
  if (BUCKETS.includes(raw as ChannelBucket)) return raw as ChannelBucket;
  return "all";
}

/**
 * site·channel 메타로 매체 구분 (뉴스 / VON / VD / SNS).
 * DB의 chan_id·chan_name 패턴에 맞게 운영에서 CASE 조정 가능.
 */
export const channelBucketCase = Prisma.sql`
  CASE
    WHEN ch.chan_name ILIKE '%뉴스%'
      OR ch.chan_name ~* '(^|[^[:alnum:]])NEWS([^[:alnum:]]|$)'
      OR s.site_name ILIKE '%뉴스%' THEN 'news'
    WHEN ch.chan_name ILIKE '%VON%'
      OR ch.chan_id ILIKE 'vo%' THEN 'von'
    WHEN ch.chan_name ILIKE '%VD%'
      OR ch.chan_id ILIKE 'vd%' THEN 'vd'
    ELSE 'sns'
  END
`;
