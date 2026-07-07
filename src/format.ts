import type { RawItem } from "@opendata-kr/core";
import type { AwardResult, OpeningSummary, BidderDetail, CompositeKey } from "./api/types.js";

const pick = (raw: RawItem, k: string): string => raw[k] ?? "";

export function compositeKeyOf(raw: RawItem | CompositeKey): string {
  const g = (k: string) => (raw as RawItem)[k] ?? "";
  return `${g("bidNtceNo")}|${g("bidNtceOrd")}|${g("bidClsfcNo")}|${g("rbidNo")}`;
}

export function parseOpengCorpInfo(s: string): { name: string; bizno: string; ceo: string; amount: string; rate: string } | null {
  if (!s) return null;
  const [name = "", bizno = "", ceo = "", amount = "", rate = ""] = s.split("^");
  return { name, bizno, ceo, amount, rate };
}

export function formatAward(raw: RawItem): AwardResult {
  return {
    bidNtceNo: pick(raw, "bidNtceNo"), bidNtceNm: pick(raw, "bidNtceNm"), participants: pick(raw, "prtcptCnum"),
    winner: pick(raw, "bidwinnrNm"), winnerBizno: pick(raw, "bidwinnrBizno"), winnerCeo: pick(raw, "bidwinnrCeoNm"),
    awardAmount: pick(raw, "sucsfbidAmt"), awardRate: pick(raw, "sucsfbidRate"), realOpeningDt: pick(raw, "rlOpengDt"),
    demandInstitution: pick(raw, "dminsttNm"), finalAwardDate: pick(raw, "fnlSucsfDate"),
  };
}

export function formatOpening(raw: RawItem): OpeningSummary {
  return {
    bidNtceNo: pick(raw, "bidNtceNo"), bidNtceNm: pick(raw, "bidNtceNm"), openingDt: pick(raw, "opengDt"),
    participants: pick(raw, "prtcptCnum"), progress: pick(raw, "progrsDivCdNm"),
    topBidder: parseOpengCorpInfo(pick(raw, "opengCorpInfo")),
    reservePriceFileExists: pick(raw, "rsrvtnPrceFileExistnceYn"),
    noticeInstitution: pick(raw, "ntceInsttNm"), demandInstitution: pick(raw, "dminsttNm"),
  };
}

export function formatBidder(raw: RawItem): BidderDetail {
  return {
    rank: pick(raw, "opengRank"), name: pick(raw, "prcbdrNm"), bizno: pick(raw, "prcbdrBizno"), ceo: pick(raw, "prcbdrCeoNm"),
    amount: pick(raw, "bidprcAmt"), rate: pick(raw, "bidprcrt"), remark: pick(raw, "rmrk"),
    priceScore: pick(raw, "bidPrceEvlVal"), techScore: pick(raw, "techEvlVal"), techRawScore: pick(raw, "techEvlNaturVal"),
    totalScore: pick(raw, "totalEvlAmtVal"), bidDt: pick(raw, "bidprcDt"),
  };
}
