import type { OperationResult, RawItem } from "@opendata-kr/core";

function toDate(yyyymmdd: string): Date {
  const y = Number(yyyymmdd.slice(0, 4)), m = Number(yyyymmdd.slice(4, 6)), d = Number(yyyymmdd.slice(6, 8));
  return new Date(Date.UTC(y, m - 1, d));
}
function fmt(dt: Date): string {
  const y = dt.getUTCFullYear(), m = String(dt.getUTCMonth() + 1).padStart(2, "0"), d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

// data.go.kr 낙찰정보 API의 조회기간 한계는 "종료일 ≤ 시작일 + 1 캘린더 개월"이다(고정 일수 아님).
// 달 길이가 달라 고정 일수 창은 짧은 달(2월)을 낀 구간에서 1개월을 넘겨 resultCode 07(입력범위값 초과)을 냈다.
// 창을 캘린더 월 경계로 자른다: 시작일~그 달 말일, 다음 창은 다음 달 1일부터. 각 창이 한 달 안에 머물러
// 항상 1개월 이내가 된다(월을 넘지 않음). 라이브 검증(2026-07-07). 반환 bgn/end는 YYYYMMDDHHMM.
export function splitDateWindows(start: string, end: string): Array<{ bgn: string; end: string }> {
  const windows: Array<{ bgn: string; end: string }> = [];
  let cur = toDate(start);
  const last = toDate(end);
  while (cur <= last) {
    // 이번 달 말일(다음 달 0일 = 이번 달 마지막 날)
    const monthEnd = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 0));
    const eff = monthEnd > last ? last : monthEnd;
    windows.push({ bgn: `${fmt(cur)}0000`, end: `${fmt(eff)}2359` });
    cur = new Date(eff);
    cur.setUTCDate(cur.getUTCDate() + 1); // 다음 달 1일
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
