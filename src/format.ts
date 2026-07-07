import type { RawItem } from "@opendata-kr/core";
import type { AwardResult, OpeningSummary, BidderDetail, TopBidder, PreparPriceDetail } from "./api/types.js";

const pick = (raw: RawItem, k: string): string => raw[k] ?? "";

export function compositeKeyOf(raw: RawItem): string {
  return `${pick(raw, "bidNtceNo")}|${pick(raw, "bidNtceOrd")}|${pick(raw, "bidClsfcNo")}|${pick(raw, "rbidNo")}`;
}

export function parseOpengCorpInfo(s: string): TopBidder | null {
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

export function aggregatePreparPrice(items: RawItem[]): PreparPriceDetail {
  const first = items[0];
  const planPrice = first ? pick(first, "plnprc") : "";
  const baseAmount = first ? pick(first, "bssamt") : "";
  const p = Number(planPrice), b = Number(baseAmount);
  const saJeongRate = first && b > 0 && Number.isFinite(p) && Number.isFinite(b) ? p / b : null;
  return {
    planPrice, baseAmount, saJeongRate,
    totalReserveCount: first ? pick(first, "totRsrvtnPrceNum") : "",
    drawn: first ? pick(first, "drwtYn") : "",
    reserves: items.map((r) => ({ seq: pick(r, "compnoRsrvtnPrceSno"), basePlanPrice: pick(r, "bsisPlnprc") })),
  };
}

// 유찰 사유는 API에 없다. 참가업체수(prtcptCnum)로 추론 힌트만 제공(spec §6, S4).
export function failReasonHint(participants: string): string {
  const n = Number(participants);
  if (!Number.isFinite(n)) return "참가업체수 미상. 유찰 사유 추정 불가";
  if (n === 0) return "무응찰 추정(참가 0). 재도전 기회일 수 있음";
  if (n === 1) return "단독응찰 추정(참가 1). 수의계약 직행 가능, 기회 낮음";
  return "적격자 없음 등 추정(참가 2+). 재도전 기회일 수 있음";
}

// 낙찰방식 구분 필드가 API에 없다. D 점수 채움 패턴으로 추정(spec §6, S5).
export function estimateAwardMethod(bidders: BidderDetail[]): { method: "negotiated" | "qualification_or_other"; uncertain: true } {
  const scored = bidders.some((b) => b.totalScore !== "" || b.techScore !== "");
  return { method: scored ? "negotiated" : "qualification_or_other", uncertain: true };
}
