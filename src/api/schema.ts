import { z } from "zod";

// data.go.kr 응답 item 검증 스키마. core README 규약대로 관용적으로 짠다.
// looseObject로 미선언 필드를 통과시키고, 필수는 조인 키(입찰공고번호)만 둔다.
// 숫자·문자열이 섞여 올 수 있는 필드(금액·율·건수·순위·번호)는 coerce.string으로 수렴시킨다.

// 4계열(A낙찰·B개찰·C예비가·D투찰) 공통 복합키 구성 필드.
const compositeKeyFields = {
  bidNtceNo: z.string(),
  bidNtceOrd: z.coerce.string().optional(),
  bidClsfcNo: z.coerce.string().optional(),
  rbidNo: z.coerce.string().optional(),
};

// compositeKeyOf가 4계열 어느 item이든 받을 수 있는 구조적 최소 타입.
export interface CompositeSource {
  bidNtceNo: string;
  bidNtceOrd?: string | undefined;
  bidClsfcNo?: string | undefined;
  rbidNo?: string | undefined;
}

// 계열 A: 최종낙찰자
export const RawAwardSchema = z.looseObject({
  ...compositeKeyFields,
  bidNtceNm: z.string().optional(),
  prtcptCnum: z.coerce.string().optional(),
  bidwinnrNm: z.string().optional(),
  bidwinnrBizno: z.coerce.string().optional(),
  bidwinnrCeoNm: z.string().optional(),
  sucsfbidAmt: z.coerce.string().optional(),
  sucsfbidRate: z.coerce.string().optional(),
  rlOpengDt: z.string().optional(),
  dminsttNm: z.string().optional(),
  fnlSucsfDate: z.string().optional(),
});
export type RawAward = z.infer<typeof RawAwardSchema>;

// 계열 B: 개찰진행
export const RawOpeningSchema = z.looseObject({
  ...compositeKeyFields,
  bidNtceNm: z.string().optional(),
  opengDt: z.string().optional(),
  prtcptCnum: z.coerce.string().optional(),
  progrsDivCdNm: z.string().optional(),
  opengCorpInfo: z.string().optional(),
  rsrvtnPrceFileExistnceYn: z.string().optional(),
  ntceInsttNm: z.string().optional(),
  dminsttNm: z.string().optional(),
});
export type RawOpening = z.infer<typeof RawOpeningSchema>;

// 계열 C: 예비가격상세
export const RawPreparPriceSchema = z.looseObject({
  ...compositeKeyFields,
  plnprc: z.coerce.string().optional(),
  bssamt: z.coerce.string().optional(),
  totRsrvtnPrceNum: z.coerce.string().optional(),
  drwtYn: z.string().optional(),
  compnoRsrvtnPrceSno: z.coerce.string().optional(),
  bsisPlnprc: z.coerce.string().optional(),
});
export type RawPreparPrice = z.infer<typeof RawPreparPriceSchema>;

// 계열 D: 투찰업체별
export const RawBidderSchema = z.looseObject({
  ...compositeKeyFields,
  opengRank: z.coerce.string().optional(),
  prcbdrNm: z.string().optional(),
  prcbdrBizno: z.coerce.string().optional(),
  prcbdrCeoNm: z.string().optional(),
  bidprcAmt: z.coerce.string().optional(),
  bidprcrt: z.coerce.string().optional(),
  rmrk: z.string().optional(),
  bidPrceEvlVal: z.coerce.string().optional(),
  techEvlVal: z.coerce.string().optional(),
  techEvlNaturVal: z.coerce.string().optional(),
  totalEvlAmtVal: z.coerce.string().optional(),
  bidprcDt: z.string().optional(),
});
export type RawBidder = z.infer<typeof RawBidderSchema>;
