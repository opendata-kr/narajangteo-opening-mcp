import { describe, it, expect, vi } from "vitest";
import { runSearchOpenings } from "./searchOpenings.js";
import type { DataGoKrClient } from "@opendata-kr/core";

function fakeClient(impl: (op: string, p: any) => Promise<any>): DataGoKrClient {
  return { call: vi.fn(impl) } as unknown as DataGoKrClient;
}

describe("runSearchOpenings", () => {
  it("status는 클라이언트 필터(progrsDivCdNm), 필터 전후 건수 구분", async () => {
    const client = fakeClient(async () => ({
      totalCount: 2,
      items: [
        { bidNtceNo: "N1", progrsDivCdNm: "유찰", prtcptCnum: "1", opengCorpInfo: "" },
        { bidNtceNo: "N2", progrsDivCdNm: "개찰완료", prtcptCnum: "3", opengCorpInfo: "A^1^김^100^99" },
      ],
    }));
    const r = await runSearchOpenings(client, {
      bidKind: ["thng"],
      status: "유찰",
      startDate: "20260601",
      endDate: "20260601",
    });
    const t = r.results.thng as any;
    expect(t.totalCountBeforeFilter).toBe(2);
    expect(t.filteredCount).toBe(1);
    expect(t.items[0].progress).toBe("유찰");
    expect(t.items[0].failReasonHint).toContain("단독응찰");
  });

  it("startDate/endDate 한쪽만 주면 에러", async () => {
    const client = fakeClient(async () => ({ totalCount: 0, items: [] }));
    await expect(runSearchOpenings(client, { startDate: "20260601" })).rejects.toThrow(/함께 지정/);
  });

  it("startDate가 endDate보다 늦으면 에러", async () => {
    const client = fakeClient(async () => ({ totalCount: 0, items: [] }));
    await expect(runSearchOpenings(client, { startDate: "20260607", endDate: "20260601" })).rejects.toThrow(/늦/);
  });

  it("부분 실패는 error로 표면화", async () => {
    const client = fakeClient(async (op) => {
      if (op.includes("Cnstwk")) throw new Error("boom");
      return { totalCount: 0, items: [] };
    });
    const r = await runSearchOpenings(client, { bidKind: ["thng", "cnstwk"], startDate: "20260601", endDate: "20260601" });
    expect("error" in (r.results.cnstwk as any)).toBe(true);
    expect("items" in (r.results.thng as any)).toBe(true);
  });
});
