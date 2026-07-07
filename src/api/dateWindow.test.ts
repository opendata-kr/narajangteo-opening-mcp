import { describe, it, expect, vi } from "vitest";
import { splitDateWindows, fetchAllPages } from "./dateWindow.js";

describe("splitDateWindows", () => {
  it("한 달 안이면 단일 창(00:00~23:59)", () => {
    expect(splitDateWindows("20260601", "20260607")).toEqual([
      { bgn: "202606010000", end: "202606072359" },
    ]);
  });
  it("여러 달을 캘린더 월 경계로 분할(2월은 28일)", () => {
    expect(splitDateWindows("20260101", "20260630")).toEqual([
      { bgn: "202601010000", end: "202601312359" },
      { bgn: "202602010000", end: "202602282359" },
      { bgn: "202603010000", end: "202603312359" },
      { bgn: "202604010000", end: "202604302359" },
      { bgn: "202605010000", end: "202605312359" },
      { bgn: "202606010000", end: "202606302359" },
    ]);
  });
  it("월 중간 시작·종료는 부분 달 창", () => {
    expect(splitDateWindows("20260115", "20260310")).toEqual([
      { bgn: "202601150000", end: "202601312359" },
      { bgn: "202602010000", end: "202602282359" },
      { bgn: "202603010000", end: "202603102359" },
    ]);
  });
  it("모든 창이 같은 달 안(월을 안 넘어 API 1개월 한계 이내)", () => {
    for (const w of splitDateWindows("20260101", "20261231")) {
      expect(w.bgn.slice(0, 6)).toBe(w.end.slice(0, 6));
    }
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
