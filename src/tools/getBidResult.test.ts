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

  it("A/B는 inqryDiv=4, C는 inqryDiv=2, 공고번호로 호출", async () => {
    const calls: Array<{ op: string; p: any }> = [];
    const client = { call: vi.fn(async (op: string, p: any) => { calls.push({ op, p }); return { totalCount: 0, items: [] }; }) } as unknown as DataGoKrClient;
    await runGetBidResult(client, { bidNtceNo: "N", bidKind: "thng", status: "completed" });
    const a = calls.find((c) => c.op.startsWith("getScsbidListSttus"))!;
    const c = calls.find((c) => c.op.includes("PreparPcDetail"))!;
    expect(a.p.inqryDiv).toBe("4"); expect(a.p.bidNtceNo).toBe("N");
    expect(c.p.inqryDiv).toBe("2");
  });

  it("myBizno와 일치하는 투찰행에 isOurs 태깅", async () => {
    const D = { bidNtceNo: "N", bidNtceOrd: "000", bidClsfcNo: "1", rbidNo: "000", opengRank: "1", prcbdrNm: "A사", prcbdrBizno: "1234567890" };
    const client = fake(async (op: string) => {
      if (op.startsWith("getOpengResultListInfoOpengCompt")) return { totalCount: 1, items: [D] };
      return { totalCount: 0, items: [] };
    });
    const r = await runGetBidResult(client, { bidNtceNo: "N", bidKind: "thng", status: "completed", myBizno: "1234567890" });
    const ex = r.executions[0]!;
    expect(ex.bidders[0]!.isOurs).toBe(true);
  });

  it("myBizno 불일치 시 isOurs 없음", async () => {
    const D = { bidNtceNo: "N", bidNtceOrd: "000", bidClsfcNo: "1", rbidNo: "000", opengRank: "1", prcbdrNm: "A사", prcbdrBizno: "1234567890" };
    const client = fake(async (op: string) => {
      if (op.startsWith("getOpengResultListInfoOpengCompt")) return { totalCount: 1, items: [D] };
      return { totalCount: 0, items: [] };
    });
    const r = await runGetBidResult(client, { bidNtceNo: "N", bidKind: "thng", status: "completed", myBizno: "9999999999" });
    const ex = r.executions[0]!;
    expect(ex.bidders[0]!.isOurs).toBeUndefined();
  });

  it("bidClsfcNo로 특정 집행만 좁힘", async () => {
    const D1 = { bidNtceNo: "N", bidNtceOrd: "000", bidClsfcNo: "1", rbidNo: "000", opengRank: "1", prcbdrNm: "1번집행" };
    const D2 = { bidNtceNo: "N", bidNtceOrd: "000", bidClsfcNo: "2", rbidNo: "000", opengRank: "1", prcbdrNm: "2번집행" };
    const client = fake(async (op: string) => {
      if (op.startsWith("getOpengResultListInfoOpengCompt")) return { totalCount: 2, items: [D1, D2] };
      return { totalCount: 0, items: [] };
    });
    const r = await runGetBidResult(client, { bidNtceNo: "N", bidKind: "thng", status: "completed", bidClsfcNo: "2" });
    expect(r.executions.length).toBe(1);
    expect(r.executions[0]!.bidClsfcNo).toBe("2");
  });
});
