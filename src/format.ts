import type {
  CompositeSource, RawAward, RawOpening, RawBidder, RawPreparPrice,
} from "./api/schema.js";
import type { AwardResult, OpeningSummary, BidderDetail, TopBidder, PreparPriceDetail } from "./api/types.js";

export function compositeKeyOf(raw: CompositeSource): string {
  return `${raw.bidNtceNo}|${raw.bidNtceOrd ?? ""}|${raw.bidClsfcNo ?? ""}|${raw.rbidNo ?? ""}`;
}

export function parseOpengCorpInfo(s: string): TopBidder | null {
  if (!s) return null;
  const [name = "", bizno = "", ceo = "", amount = "", rate = ""] = s.split("^");
  return { name, bizno, ceo, amount, rate };
}

export function formatAward(raw: RawAward): AwardResult {
  return {
    bidNtceNo: raw.bidNtceNo, bidNtceNm: raw.bidNtceNm ?? "", participants: raw.prtcptCnum ?? "",
    winner: raw.bidwinnrNm ?? "", winnerBizno: raw.bidwinnrBizno ?? "", winnerCeo: raw.bidwinnrCeoNm ?? "",
    awardAmount: raw.sucsfbidAmt ?? "", awardRate: raw.sucsfbidRate ?? "", realOpeningDt: raw.rlOpengDt ?? "",
    demandInstitution: raw.dminsttNm ?? "", finalAwardDate: raw.fnlSucsfDate ?? "",
  };
}

export function formatOpening(raw: RawOpening): OpeningSummary {
  return {
    bidNtceNo: raw.bidNtceNo, bidNtceNm: raw.bidNtceNm ?? "", openingDt: raw.opengDt ?? "",
    participants: raw.prtcptCnum ?? "", progress: raw.progrsDivCdNm ?? "",
    topBidder: parseOpengCorpInfo(raw.opengCorpInfo ?? ""),
    reservePriceFileExists: raw.rsrvtnPrceFileExistnceYn ?? "",
    noticeInstitution: raw.ntceInsttNm ?? "", demandInstitution: raw.dminsttNm ?? "",
  };
}

export function formatBidder(raw: RawBidder): BidderDetail {
  return {
    rank: raw.opengRank ?? "", name: raw.prcbdrNm ?? "", bizno: raw.prcbdrBizno ?? "", ceo: raw.prcbdrCeoNm ?? "",
    amount: raw.bidprcAmt ?? "", rate: raw.bidprcrt ?? "", remark: raw.rmrk ?? "",
    priceScore: raw.bidPrceEvlVal ?? "", techScore: raw.techEvlVal ?? "", techRawScore: raw.techEvlNaturVal ?? "",
    totalScore: raw.totalEvlAmtVal ?? "", bidDt: raw.bidprcDt ?? "",
  };
}

export function aggregatePreparPrice(items: RawPreparPrice[]): PreparPriceDetail {
  const first = items[0];
  const planPrice = first?.plnprc ?? "";
  const baseAmount = first?.bssamt ?? "";
  const p = Number(planPrice), b = Number(baseAmount);
  const saJeongRate = first && b > 0 && Number.isFinite(p) && Number.isFinite(b) ? p / b : null;
  return {
    planPrice, baseAmount, saJeongRate,
    totalReserveCount: first?.totRsrvtnPrceNum ?? "",
    drawn: first?.drwtYn ?? "",
    reserves: items.map((r) => ({ seq: r.compnoRsrvtnPrceSno ?? "", basePlanPrice: r.bsisPlnprc ?? "" })),
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
