export type FetchJsonError = {
  message: string;
  status?: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const contentType = res.headers.get("content-type") ?? "";

  let data: unknown = null;
  if (contentType.includes("application/json")) {
    data = await res.json().catch(() => null);
  } else {
    data = await res.text().catch(() => null);
  }

  if (!res.ok) {
    const msg = (() => {
      if (isRecord(data)) {
        const e = data["error"];
        if (typeof e === "string") return e;
        const d = data["detail"];
        if (typeof d === "string") return d;
        const m = data["message"];
        if (typeof m === "string") return m;
      }
      return res.statusText || "요청 실패";
    })();
    const err: FetchJsonError = { message: msg, status: res.status };
    throw err;
  }

  return data as T;
}

