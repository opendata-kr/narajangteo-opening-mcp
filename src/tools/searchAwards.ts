import { z } from "zod";
import {
  splitCalendarMonths, fanOut,
  type DataGoKrClient, type FailedWindow, type Params,
} from "@opendata-kr/core";
import { ALL_BID_KINDS, awardSearchOp, awardInqryDiv, type BidKind, type DateType } from "../api/endpoints.js";
import { RawAwardSchema } from "../api/schema.js";
import { formatAward } from "../format.js";
import type { AwardResult } from "../api/types.js";

export const searchAwardsInputShape = {
  bidKind: z.array(z.enum(["cnstwk", "servc", "thng", "frgcpt"])).optional().describe("업무구분 배열(cnstwk=공사·servc=용역·thng=물품·frgcpt=외자). 미지정 시 전 구분 병렬 조회로 API 요청이 4배로 늘어난다. 업무구분을 알면 지정해 인증키 일일 트래픽을 아낀다"),
  keyword: z.string().optional().describe("공고명 부분검색(bidNtceNm)"),
  institution: z.string().optional().describe("공고기관명(ntceInsttNm)"),
  demandInstitution: z.string().optional().describe("수요기관명(dminsttNm)"),
  demandInstitutionCode: z.string().optional().describe("수요기관코드(dminsttCd). 종단 식별에 안정적"),
  detailProductCode: z.string().optional().describe("세부품명번호(dtilPrdctClsfcNo)"),
  region: z.string().optional().describe("참가제한지역명(prtcptLmtRgnNm)"),
  industry: z.string().optional().describe("업종명(indstrytyNm)"),
  minPrice: z.number().optional().describe("추정가격 하한(presmptPrceBgn)"),
  maxPrice: z.number().optional().describe("추정가격 상한(presmptPrceEnd)"),
  bizno: z.string().optional().describe("업체 사업자번호. 그 업체의 낙찰건만 조회(진 입찰은 미포함)"),
  startDate: z.string().optional().describe("조회 시작일 YYYYMMDD"),
  endDate: z.string().optional().describe("조회 종료일 YYYYMMDD"),
  dateType: z.enum(["posted", "opened"]).optional().describe("날짜 기준. posted=공고게시(기본), opened=개찰"),
  pageSize: z.number().int().min(1).max(100).optional().describe("창당 페이지 크기(기본 100)"),
  maxPages: z.number().int().min(1).max(50).optional().describe("창당 최대 페이지(기본 10)"),
};

// inputSchema에서 파생해 shape와 타입의 원천을 하나로 유지한다(수동 중복·드리프트 방지).
export type SearchAwardsArgs = z.infer<z.ZodObject<typeof searchAwardsInputShape>>;

type KindResult =
  | { totalCount: number; invalidCount: number; items: AwardResult[]; truncated: boolean; failedWindows: FailedWindow[] }
  | { error: string };
export interface SearchAwardsResult { query: SearchAwardsArgs; results: Partial<Record<BidKind, KindResult>>; notes: string[]; }

export async function runSearchAwards(client: DataGoKrClient, args: SearchAwardsArgs): Promise<SearchAwardsResult> {
  const kinds = args.bidKind ?? [...ALL_BID_KINDS];
  const dateType: DateType = args.dateType ?? "posted";
  const inqryDiv = awardInqryDiv(dateType, true);
  const base: Params = {
    inqryDiv,
    bidNtceNm: args.keyword, ntceInsttNm: args.institution, dminsttNm: args.demandInstitution,
    dminsttCd: args.demandInstitutionCode, dtilPrdctClsfcNo: args.detailProductCode,
    prtcptLmtRgnNm: args.region, indstrytyNm: args.industry,
    presmptPrceBgn: args.minPrice, presmptPrceEnd: args.maxPrice, bizno: args.bizno,
  };

  if ((args.startDate && !args.endDate) || (!args.startDate && args.endDate)) {
    throw new Error("startDate와 endDate는 함께 지정해야 합니다.");
  }
  if (args.startDate && args.endDate && args.startDate > args.endDate) {
    throw new Error("startDate가 endDate보다 늦습니다.");
  }

  const pageSize = args.pageSize ?? 100;
  const maxPages = args.maxPages ?? 10;

  const task = async (kind: BidKind): Promise<Exclude<KindResult, { error: string }>> => {
    if (args.startDate && args.endDate) {
      const w = await client.paginateWindows(awardSearchOp(kind), {
        params: base, schema: RawAwardSchema,
        windows: splitCalendarMonths(args.startDate, args.endDate),
        pageSize, maxPages, concurrency: 1,
      });
      return {
        totalCount: w.totalCount, invalidCount: w.invalid.length,
        items: w.data.map(formatAward), truncated: w.truncated, failedWindows: w.failedWindows,
      };
    }
    const p = await client.paginate(awardSearchOp(kind), { params: base, schema: RawAwardSchema, pageSize, maxPages });
    return {
      totalCount: p.totalCount, invalidCount: p.invalid.length,
      items: p.data.map(formatAward), truncated: p.truncated, failedWindows: [],
    };
  };

  // 에러 문자열화·키 힌트는 core(fanOut 기본 errMessage·클라이언트 기본 인터셉터)가 처리한다.
  const { results: outcomes } = await fanOut(kinds, task, { label: (k) => k, concurrency: 4 });

  const results: Partial<Record<BidKind, KindResult>> = {};
  for (const kind of kinds) {
    const o = outcomes[kind];
    results[kind] = o.ok ? o.value : { error: o.error };
  }
  return {
    query: args, results,
    notes: [
      "낙찰자만 조회한다(그 업체가 참여했으나 진 입찰은 이 API로 도달 불가).",
      "여러 창은 캘린더 월 경계로 분할하며 창은 순차 조회한다. 일부 창이 실패하면 failedWindows에 담기고 totalCount는 성공 창 합계다.",
      "invalidCount는 응답 스키마 검증에서 탈락해 items에서 제외된 건수다(0이 아니면 API 응답 드리프트 신호).",
    ],
  };
}
