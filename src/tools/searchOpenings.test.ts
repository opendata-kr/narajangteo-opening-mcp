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
    // 무날짜 경로(fetchAllPages 직접 호출)는 core fetchWindows와 달리 에러를 삼키지 않고
    // fanOut까지 전파해 kind 전체가 error가 된다. window 단위 부분실패는 아래 별도 테스트가 다룬다.
    const client = fakeClient(async (op) => {
      if (op.includes("Cnstwk")) throw new Error("boom");
      return { totalCount: 0, items: [] };
    });
    const r = await runSearchOpenings(client, { bidKind: ["thng", "cnstwk"] });
    expect("error" in (r.results.cnstwk as any)).toBe(true);
    expect("items" in (r.results.thng as any)).toBe(true);
  });

  it("무날짜 검색은 fetchAllPages 직접 경로로 0건이 아니다", async () => {
    const calls: string[] = [];
    const fakeClient = {
      serviceKeyLooksPreEncoded: false,
      call: async (op: string) => { calls.push(op); return { totalCount: 1, items: [{ bidNtceNo: "1", progrsDivCdNm: "개찰완료" }], resultCode: "00", resultMsg: "OK" }; },
    } as unknown as DataGoKrClient;
    const r = await runSearchOpenings(fakeClient, { bidKind: ["cnstwk"] });
    const cnstwk = r.results.cnstwk;
    expect(cnstwk && "items" in cnstwk ? cnstwk.items.length : -1).toBe(1);
    expect(calls.length).toBeGreaterThan(0); // 무날짜여도 호출 발생
  });

  it("window 부분실패는 failedWindows로 표면화되고 kind는 성공 유지", async () => {
    const fakeClient = {
      serviceKeyLooksPreEncoded: false,
      call: async (op: string, p: { inqryBgnDt?: string }) => {
        if (p.inqryBgnDt?.startsWith("202602")) throw new Error("타임아웃");
        return { totalCount: 1, items: [{ bidNtceNo: "1", progrsDivCdNm: "개찰완료" }], resultCode: "00", resultMsg: "OK" };
      },
    } as unknown as DataGoKrClient;
    const r = await runSearchOpenings(fakeClient, { bidKind: ["cnstwk"], startDate: "20260115", endDate: "20260310" });
    const cnstwk = r.results.cnstwk;
    if (!cnstwk || "error" in cnstwk) throw new Error("kind가 통째 실패하면 안 됨");
    expect(cnstwk.failedWindows.length).toBe(1);
    expect(cnstwk.failedWindows[0]!.window.bgn.startsWith("202602")).toBe(true);
    expect(cnstwk.items.length).toBe(2); // 1월·3월 window 성공분
  });
});
