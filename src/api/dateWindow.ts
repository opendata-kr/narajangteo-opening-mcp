import type { OperationResult, RawItem } from "@opendata-kr/core";

// 라이브 검증(2026-07-07): 낙찰 서비스는 1개월 창도 통과(1주 1189·1개월 6096건 정상).
// 형제 bid 서비스(1주 축소)와 달라 31일로 둔다.
export const MAX_WINDOW_DAYS = 31;

function toDate(yyyymmdd: string): Date {
  const y = Number(yyyymmdd.slice(0, 4)), m = Number(yyyymmdd.slice(4, 6)), d = Number(yyyymmdd.slice(6, 8));
  return new Date(Date.UTC(y, m - 1, d));
}
function fmt(dt: Date): string {
  const y = dt.getUTCFullYear(), m = String(dt.getUTCMonth() + 1).padStart(2, "0"), d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export function splitDateWindows(start: string, end: string, maxDays: number): Array<{ bgn: string; end: string }> {
  const windows: Array<{ bgn: string; end: string }> = [];
  let cur = toDate(start);
  const last = toDate(end);
  while (cur <= last) {
    const winEnd = new Date(cur);
    winEnd.setUTCDate(winEnd.getUTCDate() + maxDays - 1);
    const eff = winEnd > last ? last : winEnd;
    windows.push({ bgn: `${fmt(cur)}0000`, end: `${fmt(eff)}2359` });
    cur = new Date(eff);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return windows;
}

type CallFn = (op: string, params: Record<string, string | number | undefined>) => Promise<OperationResult>;

export async function fetchAllPages(
  call: CallFn, op: string, params: Record<string, string | number | undefined>,
  opts: { pageSize: number; maxPages: number },
): Promise<{ totalCount: number; items: RawItem[]; truncated: boolean }> {
  const items: RawItem[] = [];
  let totalCount = 0;
  let page = 1;
  for (; page <= opts.maxPages; page++) {
    const r = await call(op, { ...params, pageNo: page, numOfRows: opts.pageSize });
    totalCount = r.totalCount;
    items.push(...r.items);
    if (items.length >= totalCount || r.items.length === 0) {
      return { totalCount, items, truncated: false };
    }
  }
  return { totalCount, items, truncated: true };
}
