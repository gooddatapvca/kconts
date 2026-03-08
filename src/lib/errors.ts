export function errorMessage(err: unknown, fallback: string): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || fallback;

  if (typeof err === "object") {
    const r = err as Record<string, unknown>;
    const msg = r["message"];
    if (typeof msg === "string" && msg.trim()) return msg;
  }

  return fallback;
}

