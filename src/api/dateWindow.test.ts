import { describe, it, expect, vi } from "vitest";
import { splitDateWindows, fetchAllPages } from "./dateWindow.js";

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
