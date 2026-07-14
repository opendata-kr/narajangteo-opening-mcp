import { describe, it, expect } from "vitest";
import { awardListOp, openingListOp, preparPriceOp, D_OPERATION } from "../api/endpoints.js";
import { makeTestClient, type OpStub } from "../test-helpers.js";
import { runGetBidResult } from "./getBidResult.js";

// thng 구분 + completed 상태로 좁힌 조회의 4계열 스텁을 조립한다.
function stubsFor(perSeries: { a?: OpStub; b?: OpStub; c?: OpStub; d?: OpStub }): Record<string, OpStub> {
  const stubs: Record<string, OpStub> = {};
  if (perSeries.a) stubs[awardListOp("thng")] = perSeries.a;
  if (perSeries.b) stubs[openingListOp("thng")] = perSeries.b;
  if (perSeries.c) stubs[preparPriceOp("thng")] = perSeries.c;
  if (perSeries.d) stubs[D_OPERATION.completed] = perSeries.d;
  return stubs;
}

describe("runGetBidResult", () => {
  it("복합키로 집행을 분리해 A/B/C/D를 조인", async () => {
    const A = { bidNtceNo: "N", bidNtceOrd: "000", bidClsfcNo: "1", rbidNo: "000", bidwinnrNm: "A사" };
    const B = { bidNtceNo: "N", bidNtceOrd: "000", bidClsfcNo: "1", rbidNo: "000", progrsDivCdNm: "개찰완료", opengCorpInfo: "" };
    const D = { bidNtceNo: "N", bidNtceOrd: "000", bidClsfcNo: "1", rbidNo: "000", opengRank: "1", prcbdrNm: "A사", totalEvlAmtVal: "91.0" };
    const { client } = makeTestClient(stubsFor({ a: { items: [A] }, b: { items: [B] }, d: { items: [D] } }));
    const r = await runGetBidResult(client, { bidNtceNo: "N", bidKind: "thng", status: "completed" });
    expect(r.executions.length).toBe(1);
    const ex = r.executions[0]!;
    expect(ex.bidClsfcNo).toBe("1");
    expect(ex.award?.winner).toBe("A사");
    expect(ex.bidders[0]!.rank).toBe("1");
    expect(ex.awardMethod.method).toBe("negotiated");
    expect(r.invalidCount).toBe(0);
  });

  it("서로 다른 집행이 섞이지 않는다", async () => {
    const D1 = { bidNtceNo: "N", bidNtceOrd: "000", bidClsfcNo: "1", rbidNo: "000", opengRank: "1", prcbdrNm: "1번집행" };
    const D2 = { bidNtceNo: "N", bidNtceOrd: "000", bidClsfcNo: "2", rbidNo: "000", opengRank: "1", prcbdrNm: "2번집행" };
    const B1 = { bidNtceNo: "N", bidNtceOrd: "000", bidClsfcNo: "1", rbidNo: "000", progrsDivCdNm: "개찰완료" };
    const B2 = { bidNtceNo: "N", bidNtceOrd: "000", bidClsfcNo: "2", rbidNo: "000", progrsDivCdNm: "개찰완료" };
    const { client } = makeTestClient(stubsFor({ b: { items: [B1, B2] }, d: { items: [D1, D2] } }));
    const r = await runGetBidResult(client, { bidNtceNo: "N", bidKind: "thng", status: "completed" });
    expect(r.executions.length).toBe(2);
    const clsfc1 = r.executions.find((e) => e.bidClsfcNo === "1")!;
    expect(clsfc1.bidders.every((b) => b.name === "1번집행")).toBe(true);
  });

  it("A/B는 inqryDiv=4, C는 inqryDiv=2, 공고번호로 호출", async () => {
    const { client, requests } = makeTestClient({});
    await runGetBidResult(client, { bidNtceNo: "N", bidKind: "thng", status: "completed" });
    const a = requests.find((q) => q.op === awardListOp("thng"))!;
    const c = requests.find((q) => q.op === preparPriceOp("thng"))!;
    expect(a.params.get("inqryDiv")).toBe("4");
    expect(a.params.get("bidNtceNo")).toBe("N");
    expect(c.params.get("inqryDiv")).toBe("2");
  });

  it("myBizno와 일치하는 투찰행에 isOurs 태깅", async () => {
    const D = { bidNtceNo: "N", bidNtceOrd: "000", bidClsfcNo: "1", rbidNo: "000", opengRank: "1", prcbdrNm: "A사", prcbdrBizno: "1234567890" };
    const { client } = makeTestClient(stubsFor({ d: { items: [D] } }));
    const r = await runGetBidResult(client, { bidNtceNo: "N", bidKind: "thng", status: "completed", myBizno: "1234567890" });
    expect(r.executions[0]!.bidders[0]!.isOurs).toBe(true);
  });

  it("myBizno 불일치 시 isOurs 없음", async () => {
    const D = { bidNtceNo: "N", bidNtceOrd: "000", bidClsfcNo: "1", rbidNo: "000", opengRank: "1", prcbdrNm: "A사", prcbdrBizno: "1234567890" };
    const { client } = makeTestClient(stubsFor({ d: { items: [D] } }));
    const r = await runGetBidResult(client, { bidNtceNo: "N", bidKind: "thng", status: "completed", myBizno: "9999999999" });
    expect(r.executions[0]!.bidders[0]!.isOurs).toBeUndefined();
  });

  it("bidClsfcNo로 특정 집행만 좁힘", async () => {
    const D1 = { bidNtceNo: "N", bidNtceOrd: "000", bidClsfcNo: "1", rbidNo: "000", opengRank: "1", prcbdrNm: "1번집행" };
    const D2 = { bidNtceNo: "N", bidNtceOrd: "000", bidClsfcNo: "2", rbidNo: "000", opengRank: "1", prcbdrNm: "2번집행" };
    const { client } = makeTestClient(stubsFor({ d: { items: [D1, D2] } }));
    const r = await runGetBidResult(client, { bidNtceNo: "N", bidKind: "thng", status: "completed", bidClsfcNo: "2" });
    expect(r.executions.length).toBe(1);
    expect(r.executions[0]!.bidClsfcNo).toBe("2");
  });

  it("계열 한쪽 실패는 errors로, 스키마 탈락은 invalidCount로 집계", async () => {
    const D = { bidNtceNo: "N", bidNtceOrd: "000", bidClsfcNo: "1", rbidNo: "000", prcbdrNm: "A사" };
    const { client } = makeTestClient(stubsFor({
      a: { errorCode: "99", errorMsg: "boom" },
      d: { items: [D, { prcbdrNm: "공고번호 없는 행" }] },
    }));
    const r = await runGetBidResult(client, { bidNtceNo: "N", bidKind: "thng", status: "completed" });
    expect(r.errors.some((e) => e.includes(awardListOp("thng")))).toBe(true);
    expect(r.invalidCount).toBe(1);
    expect(r.executions.length).toBe(1);
  });
});
