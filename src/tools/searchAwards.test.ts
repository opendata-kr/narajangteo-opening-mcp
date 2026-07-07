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
    const client = fakeClient(async (op) => {
      if (op.includes("Cnstwk")) throw new Error("boom");
      return { totalCount: 0, items: [] };
    });
    const r = await runSearchAwards(client, { bidKind: ["thng", "cnstwk"], startDate: "20260601", endDate: "20260601" });
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
});
