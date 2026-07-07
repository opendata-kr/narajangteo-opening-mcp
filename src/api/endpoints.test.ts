import { describe, it, expect } from "vitest";
import {
  ALL_BID_KINDS, awardListOp, awardSearchOp, openingListOp, openingSearchOp,
  preparPriceOp, D_OPERATION, awardInqryDiv, openingInqryDiv,
} from "./endpoints.js";

describe("endpoints", () => {
  it("업무구분별 오퍼레이션명", () => {
    expect(awardListOp("thng")).toBe("getScsbidListSttusThng");
    expect(awardSearchOp("cnstwk")).toBe("getScsbidListSttusCnstwkPPSSrch");
    expect(openingListOp("servc")).toBe("getOpengResultListInfoServc");
    expect(openingSearchOp("frgcpt")).toBe("getOpengResultListInfoFrgcptPPSSrch");
    expect(preparPriceOp("thng")).toBe("getOpengResultListInfoThngPreparPcDetail");
  });
  it("D 상태 오퍼레이션", () => {
    expect(D_OPERATION.completed).toBe("getOpengResultListInfoOpengCompt");
    expect(D_OPERATION.failing).toBe("getOpengResultListInfoFailing");
    expect(D_OPERATION.rebid).toBe("getOpengResultListInfoRebid");
  });
  it("inqryDiv A: 기본판 1등록2공고3개찰4공고번호, PPSSrch 1공고게시2개찰3공고번호", () => {
    expect(awardInqryDiv("posted", false)).toBe("2");
    expect(awardInqryDiv("opened", false)).toBe("3");
    expect(awardInqryDiv("notice", false)).toBe("4");
    expect(awardInqryDiv("posted", true)).toBe("1");
    expect(awardInqryDiv("opened", true)).toBe("2");
    expect(awardInqryDiv("notice", true)).toBe("3");
  });
  it("inqryDiv B: 기본판 1입력2공고3개찰4공고번호, PPSSrch 동일체계", () => {
    expect(openingInqryDiv("posted", false)).toBe("2");
    expect(openingInqryDiv("opened", false)).toBe("3");
    expect(openingInqryDiv("notice", false)).toBe("4");
    expect(openingInqryDiv("posted", true)).toBe("1");
    expect(openingInqryDiv("opened", true)).toBe("2");
    expect(openingInqryDiv("notice", true)).toBe("3");
  });
  it("ALL_BID_KINDS는 4구분", () => {
    expect([...ALL_BID_KINDS].sort()).toEqual(["cnstwk", "frgcpt", "servc", "thng"]);
  });
});
