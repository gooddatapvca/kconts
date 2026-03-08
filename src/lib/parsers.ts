export function parseCommaSeparatedBigints(input: string): bigint[] {
  const raw = (input ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const out: bigint[] = [];
  for (const token of raw) {
    if (!/^\d+$/.test(token)) continue;
    try {
      out.push(BigInt(token));
    } catch {
      // ignore
    }
  }

  // unique, stable
  return Array.from(new Set(out.map(String))).map((s) => BigInt(s));
}

export const WEEKDAYS: Array<{ key: number; label: string }> = [
  { key: 1, label: "월" },
  { key: 2, label: "화" },
  { key: 3, label: "수" },
  { key: 4, label: "목" },
  { key: 5, label: "금" },
  { key: 6, label: "토" },
  { key: 7, label: "일" },
];

export function formatWeekdays(days: number[] | null | undefined): string {
  if (!days?.length) return "-";
  const set = new Set(days);
  return WEEKDAYS.filter((d) => set.has(d.key))
    .map((d) => d.label)
    .join("/");
}

