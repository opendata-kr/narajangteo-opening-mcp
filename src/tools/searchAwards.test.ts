import { describe, it, expect, vi } from "vitest";
import { runSearchAwards } from "./searchAwards.js";
import type { DataGoKrClient } from "@opendata-kr/core";

function fakeClient(impl: (op: string, p: any) => Promise<any>): DataGoKrClient {
  return { call: vi.fn(impl) } as unknown as DataGoKrClient;
}

describe("runSearchAwards", () => {
  it("업무구분 지정 시 해당 구분만, 낙찰자 요약 반환", async () => {
    const client = fakeClient(async () => ({ totalCount: 1, items: [{ bidNtceNo: "R25BK1", bidwinnrNm: "A사", sucsfbidRate: "97.8" }] }));
    const r = await runSearchAwards(client, { bidKind: ["thng"], keyword: "센터", startDate: "20260601", endDate: "20260607" });
    expect(r.results.thng && "items" in r.results.thng).toBe(true);
    const thng = r.results.thng as { items: any[] };
    expect(thng.items[0].winner).toBe("A사");
    expect(r.notes.some(n => /낙찰자만/.test(n))).toBe(true);
  });
  it("부분 실패는 error로 표면화", async () => {
    // 무날짜 경로(fetchAllPages 직접 호출)는 core fetchWindows와 달리 에러를 삼키지 않고
    // fanOut까지 전파해 kind 전체가 error가 된다. window 단위 부분실패는 아래 별도 테스트가 다룬다.
    const client = fakeClient(async (op) => {
      if (op.includes("Cnstwk")) throw new Error("boom");
      return { totalCount: 0, items: [] };
    });
    const r = await runSearchAwards(client, { bidKind: ["thng", "cnstwk"] });
    expect("error" in (r.results.cnstwk as any)).toBe(true);
    expect("items" in (r.results.thng as any)).toBe(true);
  });
  it("startDate/endDate 한쪽만 주면 에러", async () => {
    const client = fakeClient(async () => ({ totalCount: 0, items: [] }));
    await expect(runSearchAwards(client, { startDate: "20260601" })).rejects.toThrow(/함께 지정/);
  });
  it("startDate가 endDate보다 늦으면 에러", async () => {
    const client = fakeClient(async () => ({ totalCount: 0, items: [] }));
    await expect(runSearchAwards(client, { startDate: "20260607", endDate: "20260601" })).rejects.toThrow(/늦/);
  });

  it("무날짜 검색은 fetchAllPages 직접 경로로 0건이 아니다", async () => {
    const fakeClient = {
      serviceKeyLooksPreEncoded: false,
      call: async () => ({ totalCount: 1, items: [{ bidNtceNo: "1" }], resultCode: "00", resultMsg: "OK" }),
    } as unknown as DataGoKrClient;
    const r = await runSearchAwards(fakeClient, { bidKind: ["cnstwk"] });
    const cnstwk = r.results.cnstwk;
    expect(cnstwk && "items" in cnstwk ? cnstwk.items.length : -1).toBe(1);
  });

  it("window 부분실패는 failedWindows로 표면화", async () => {
    const fakeClient = {
      serviceKeyLooksPreEncoded: false,
      call: async (_op: string, p: { inqryBgnDt?: string }) => {
        if (p.inqryBgnDt?.startsWith("202602")) throw new Error("타임아웃");
        return { totalCount: 1, items: [{ bidNtceNo: "1" }], resultCode: "00", resultMsg: "OK" };
      },
    } as unknown as DataGoKrClient;
    const r = await runSearchAwards(fakeClient, { bidKind: ["cnstwk"], startDate: "20260115", endDate: "20260310" });
    const cnstwk = r.results.cnstwk;
    if (!cnstwk || "error" in cnstwk) throw new Error("kind가 통째 실패하면 안 됨");
    expect(cnstwk.failedWindows.length).toBe(1);
    expect(cnstwk.items.length).toBe(2);
  });
});
