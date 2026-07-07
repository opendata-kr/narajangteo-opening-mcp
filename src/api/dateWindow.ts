import type { OperationResult, RawItem } from "@opendata-kr/core";

// API 한계는 "종료일 ≤ 시작일 + 1 캘린더 개월"이다(고정 일수 아님). 달 길이가 달라
// 고정 31일 창은 2월을 낀 구간에서 1개월을 넘겨 resultCode 07(입력범위값 초과)을 낸다
// (예: Feb1~Mar3 = 31일이지만 Feb1+1개월=Mar1 초과). 최단 캘린더 월(2월=28일) 이하로
// 두면 어떤 시작일에서도 항상 1개월 이내라 안전하다. 라이브 검증(2026-07-07)으로 확인.
export const MAX_WINDOW_DAYS = 28;

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
