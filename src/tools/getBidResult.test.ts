import { describe, it, expect, vi } from "vitest";
import { runGetBidResult } from "./getBidResult.js";
import type { DataGoKrClient } from "@opendata-kr/core";
const fake = (impl: any) => ({ call: vi.fn(impl) } as unknown as DataGoKrClient);

describe("runGetBidResult", () => {
  it("복합키로 집행을 분리해 A/B/C/D를 조인", async () => {
    const A = { bidNtceNo: "N", bidNtceOrd: "000", bidClsfcNo: "1", rbidNo: "000", bidwinnrNm: "A사" };
    const B = { bidNtceNo: "N", bidNtceOrd: "000", bidClsfcNo: "1", rbidNo: "000", progrsDivCdNm: "개찰완료", opengCorpInfo: "" };
    const D = { bidNtceNo: "N", bidNtceOrd: "000", bidClsfcNo: "1", rbidNo: "000", opengRank: "1", prcbdrNm: "A사", totalEvlAmtVal: "91.0" };
    const client = fake(async (op: string) => {
      if (op.startsWith("getScsbidListSttus")) return { totalCount: 1, items: [A] };
      if (op.includes("PreparPcDetail")) return { totalCount: 0, items: [] };
      if (op.startsWith("getOpengResultListInfoOpengCompt")) return { totalCount: 1, items: [D] };
      if (op.startsWith("getOpengResultListInfo")) return { totalCount: 1, items: [B] };
      return { totalCount: 0, items: [] };
    });
    const r = await runGetBidResult(client, { bidNtceNo: "N", bidKind: "thng", status: "completed" });
    expect(r.executions.length).toBe(1);
    const ex = r.executions[0]!;
    expect(ex.bidClsfcNo).toBe("1");
    expect(ex.award?.winner).toBe("A사");
    expect(ex.bidders[0]!.rank).toBe("1");
    expect(ex.awardMethod.method).toBe("negotiated");
  });

  it("서로 다른 집행이 섞이지 않는다", async () => {
    const D1 = { bidNtceNo: "N", bidNtceOrd: "000", bidClsfcNo: "1", rbidNo: "000", opengRank: "1", prcbdrNm: "1번집행" };
    const D2 = { bidNtceNo: "N", bidNtceOrd: "000", bidClsfcNo: "2", rbidNo: "000", opengRank: "1", prcbdrNm: "2번집행" };
    const B1 = { bidNtceNo: "N", bidNtceOrd: "000", bidClsfcNo: "1", rbidNo: "000", progrsDivCdNm: "개찰완료" };
    const B2 = { bidNtceNo: "N", bidNtceOrd: "000", bidClsfcNo: "2", rbidNo: "000", progrsDivCdNm: "개찰완료" };
    const client = fake(async (op: string) => {
      if (op.startsWith("getScsbidListSttus")) return { totalCount: 0, items: [] };
      if (op.includes("PreparPcDetail")) return { totalCount: 0, items: [] };
      if (op.startsWith("getOpengResultListInfoOpengCompt")) return { totalCount: 2, items: [D1, D2] };
      if (op.startsWith("getOpengResultListInfo") && !op.includes("Prepar")) return { totalCount: 2, items: [B1, B2] };
      return { totalCount: 0, items: [] };
    });
    const r = await runGetBidResult(client, { bidNtceNo: "N", bidKind: "thng", status: "completed" });
    expect(r.executions.length).toBe(2);
    const clsfc1 = r.executions.find((e) => e.bidClsfcNo === "1")!;
    expect(clsfc1.bidders.every((b) => b.name === "1번집행")).toBe(true);
  });
});
