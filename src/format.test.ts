import { describe, it, expect } from "vitest";
import { parseOpengCorpInfo, formatAward, formatOpening, formatBidder, compositeKeyOf } from "./format.js";

describe("parseOpengCorpInfo", () => {
  it("단일 낙찰자 packed 문자열 파싱", () => {
    const r = parseOpengCorpInfo("이엠테스트코리아 주식회사^1428139282^김종인^178750000^97.992");
    expect(r).toEqual({ name: "이엠테스트코리아 주식회사", bizno: "1428139282", ceo: "김종인", amount: "178750000", rate: "97.992" });
  });
  it("빈 문자열은 null", () => {
    expect(parseOpengCorpInfo("")).toBeNull();
  });
  it("협상계약(투찰금액·율 없음) 부분 파싱", () => {
    const r = parseOpengCorpInfo("낙찰예정자 다수^^^^");
    expect(r?.name).toBe("낙찰예정자 다수");
    expect(r?.amount).toBe("");
  });
});

describe("formatAward", () => {
  it("낙찰자 요약 필드 추출", () => {
    const raw = { bidNtceNo: "R25BK00965123", bidNtceNm: "혁신육아복합센터", bidwinnrNm: "주식회사 동광보일러", bidwinnrBizno: "1408121883", sucsfbidAmt: "83500000", sucsfbidRate: "97.82", dminsttNm: "인천광역시", fnlSucsfDate: "2025-07-23", prtcptCnum: "2" };
    const a = formatAward(raw);
    expect(a.winner).toBe("주식회사 동광보일러");
    expect(a.winnerBizno).toBe("1408121883");
    expect(a.awardAmount).toBe("83500000");
    expect(a.awardRate).toBe("97.82");
  });
});

describe("compositeKeyOf", () => {
  it("복합키 문자열", () => {
    expect(compositeKeyOf({ bidNtceNo: "R25BK01027145", bidNtceOrd: "002", bidClsfcNo: "0", rbidNo: "000" }))
      .toBe("R25BK01027145|002|0|000");
  });
});

describe("formatBidder", () => {
  it("투찰업체 상세 + 협상계약 점수", () => {
    const raw = { opengRank: "1", prcbdrNm: "주식회사 예신뷰", prcbdrBizno: "6438701544", bidprcAmt: "100111000", bidprcrt: "91.01", bidPrceEvlVal: "9.5894", techEvlVal: "81.5", totalEvlAmtVal: "91.0894" };
    const b = formatBidder(raw);
    expect(b.rank).toBe("1");
    expect(b.amount).toBe("100111000");
    expect(b.priceScore).toBe("9.5894");
    expect(b.totalScore).toBe("91.0894");
  });
});

describe("formatOpening", () => {
  it("개찰진행 요약 + topBidder 파싱", () => {
    const raw = { bidNtceNo: "N1", bidNtceNm: "구매", opengDt: "2025-06-17 11:00:00", prtcptCnum: "2", progrsDivCdNm: "개찰완료", opengCorpInfo: "A사^1^김^100^99.9", rsrvtnPrceFileExistnceYn: "Y", ntceInsttNm: "조달청", dminsttNm: "수요기관" };
    const o = formatOpening(raw);
    expect(o.openingDt).toBe("2025-06-17 11:00:00");
    expect(o.progress).toBe("개찰완료");
    expect(o.reservePriceFileExists).toBe("Y");
    expect(o.topBidder?.name).toBe("A사");
    expect(o.topBidder?.rate).toBe("99.9");
  });
  it("opengCorpInfo 없으면 topBidder null", () => {
    const o = formatOpening({ bidNtceNo: "N", opengCorpInfo: "" });
    expect(o.topBidder).toBeNull();
  });
});
