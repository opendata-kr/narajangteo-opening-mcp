import { describe, it, expect, vi } from "vitest";
import { splitDateWindows, fetchAllPages, MAX_WINDOW_DAYS } from "./dateWindow.js";

function windowDays(bgn: string, end: string): number {
  const d = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));
  return (d(end.slice(0, 8)) - d(bgn.slice(0, 8))) / 86400000 + 1;
}

describe("splitDateWindows", () => {
  it("maxDays 이하면 단일 창(00:00~23:59)", () => {
    expect(splitDateWindows("20260601", "20260607", 7)).toEqual([
      { bgn: "202606010000", end: "202606072359" },
    ]);
  });
  it("넓은 기간을 maxDays 단위로 분할", () => {
    const w = splitDateWindows("20260601", "20260620", 7);
    expect(w.length).toBe(3);
    expect(w[0]).toEqual({ bgn: "202606010000", end: "202606072359" });
    expect(w[2]!.end).toBe("202606202359");
  });
  it("MAX_WINDOW_DAYS는 최단 캘린더 월(2월=28일) 이하라야 API 1개월 한계에 안전", () => {
    expect(MAX_WINDOW_DAYS).toBeLessThanOrEqual(28);
  });
  it("2월을 낀 넓은 기간 분할 시 모든 창이 MAX_WINDOW_DAYS 이하(입력범위 초과 방지)", () => {
    const w = splitDateWindows("20260101", "20260630", MAX_WINDOW_DAYS);
    for (const win of w) expect(windowDays(win.bgn, win.end)).toBeLessThanOrEqual(MAX_WINDOW_DAYS);
    expect(w.at(-1)!.end).toBe("202606302359");
  });
});

describe("fetchAllPages", () => {
  it("totalCount까지 페이지를 소진해 합친다", async () => {
    const call = vi.fn()
      .mockResolvedValueOnce({ totalCount: 3, items: [{ a: "1" }, { a: "2" }] })
      .mockResolvedValueOnce({ totalCount: 3, items: [{ a: "3" }] });
    const r = await fetchAllPages(call, "op", { inqryDiv: "1" }, { pageSize: 2, maxPages: 10 });
    expect(r.items.map((i) => i.a)).toEqual(["1", "2", "3"]);
    expect(r.totalCount).toBe(3);
    expect(r.truncated).toBe(false);
    expect(call).toHaveBeenCalledTimes(2);
  });
  it("maxPages 초과 시 truncated=true", async () => {
    const call = vi.fn().mockResolvedValue({ totalCount: 100, items: [{ a: "x" }] });
    const r = await fetchAllPages(call, "op", {}, { pageSize: 1, maxPages: 2 });
    expect(r.items.length).toBe(2);
    expect(r.truncated).toBe(true);
  });
});
