export type BidKind = "cnstwk" | "servc" | "thng" | "frgcpt";
export const ALL_BID_KINDS: readonly BidKind[] = ["cnstwk", "servc", "thng", "frgcpt"];
const SUFFIX: Record<BidKind, string> = {
  cnstwk: "Cnstwk", servc: "Servc", thng: "Thng", frgcpt: "Frgcpt",
};

// 계열 A: 낙찰된 목록 현황
export const awardListOp = (k: BidKind): string => `getScsbidListSttus${SUFFIX[k]}`;
export const awardSearchOp = (k: BidKind): string => `getScsbidListSttus${SUFFIX[k]}PPSSrch`;
// 계열 B: 개찰결과 목록
export const openingListOp = (k: BidKind): string => `getOpengResultListInfo${SUFFIX[k]}`;
export const openingSearchOp = (k: BidKind): string => `getOpengResultListInfo${SUFFIX[k]}PPSSrch`;
// 계열 C: 예비가격상세
export const preparPriceOp = (k: BidKind): string => `getOpengResultListInfo${SUFFIX[k]}PreparPcDetail`;

// 계열 D: 상태별 (업무구분 무관 단일 오퍼레이션)
export type OpeningStatus = "completed" | "failing" | "rebid";
export const ALL_OPENING_STATUS: readonly OpeningStatus[] = ["completed", "failing", "rebid"];
export const D_OPERATION: Record<OpeningStatus, string> = {
  completed: "getOpengResultListInfoOpengCompt",
  failing: "getOpengResultListInfoFailing",
  rebid: "getOpengResultListInfoRebid",
};

// 날짜 기준. posted=공고(게시), opened=개찰, notice=공고번호 단건.
export type DateType = "posted" | "opened" | "notice";

// A 기본판: 1등록 2공고 3개찰 4공고번호 / A PPSSrch: 1공고게시 2개찰 3공고번호
export function awardInqryDiv(dateType: DateType, ppsSrch: boolean): string {
  if (ppsSrch) return dateType === "notice" ? "3" : dateType === "opened" ? "2" : "1";
  return dateType === "notice" ? "4" : dateType === "opened" ? "3" : "2";
}
// B 기본판: 1입력 2공고 3개찰 4공고번호 / B PPSSrch: A PPSSrch와 동일
export function openingInqryDiv(dateType: DateType, ppsSrch: boolean): string {
  if (ppsSrch) return dateType === "notice" ? "3" : dateType === "opened" ? "2" : "1";
  return dateType === "notice" ? "4" : dateType === "opened" ? "3" : "2";
}
