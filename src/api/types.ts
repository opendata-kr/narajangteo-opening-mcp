export interface CompositeKey {
  bidNtceNo: string; bidNtceOrd: string; bidClsfcNo: string; rbidNo: string;
}

// 계열 A: 최종낙찰자
export interface AwardResult {
  bidNtceNo: string; bidNtceNm: string; participants: string;
  winner: string; winnerBizno: string; winnerCeo: string;
  awardAmount: string; awardRate: string; realOpeningDt: string;
  demandInstitution: string; finalAwardDate: string;
}
// 계열 B: 개찰진행 (opengCorpInfo 구조화 포함)
export interface OpeningSummary {
  bidNtceNo: string; bidNtceNm: string; openingDt: string; participants: string;
  progress: string; topBidder: { name: string; bizno: string; ceo: string; amount: string; rate: string } | null;
  reservePriceFileExists: string; noticeInstitution: string; demandInstitution: string;
  failReasonHint?: string;
}
// 계열 C: 예비가격상세(집행 단위 집약)
export interface PreparPriceDetail {
  planPrice: string; baseAmount: string; saJeongRate: number | null;
  totalReserveCount: string; drawn: string; reserves: Array<{ seq: string; basePlanPrice: string }>;
}
// 계열 D: 투찰업체별
export interface BidderDetail {
  rank: string; name: string; bizno: string; ceo: string;
  amount: string; rate: string; remark: string;
  priceScore: string; techScore: string; techRawScore: string; totalScore: string;
  bidDt: string;
  isOurs?: boolean;
}
