import { z } from "zod";
import type { DataGoKrClient } from "@opendata-kr/core";
import { ALL_BID_KINDS, awardSearchOp, awardInqryDiv, type BidKind, type DateType } from "../api/endpoints.js";
import { splitDateWindows, fetchAllPages, MAX_WINDOW_DAYS } from "../api/dateWindow.js";
import { formatAward } from "../format.js";
import type { AwardResult } from "../api/types.js";

export const searchAwardsInputShape = {
  bidKind: z.array(z.enum(["cnstwk", "servc", "thng", "frgcpt"])).optional().describe("업무구분 배열. 미지정 시 전 구분 병렬"),
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

export type SearchAwardsArgs = {
  bidKind?: BidKind[]; keyword?: string; institution?: string; demandInstitution?: string;
  demandInstitutionCode?: string; detailProductCode?: string; region?: string; industry?: string;
  minPrice?: number; maxPrice?: number; bizno?: string; startDate?: string; endDate?: string;
  dateType?: "posted" | "opened"; pageSize?: number; maxPages?: number;
};

type KindResult = { totalCount: number; items: AwardResult[]; truncated: boolean } | { error: string };
export interface SearchAwardsResult { query: SearchAwardsArgs; results: Partial<Record<BidKind, KindResult>>; notes: string[]; }

export async function runSearchAwards(client: DataGoKrClient, args: SearchAwardsArgs): Promise<SearchAwardsResult> {
  const kinds = args.bidKind ?? [...ALL_BID_KINDS];
  const dateType: DateType = args.dateType ?? "posted";
  const inqryDiv = awardInqryDiv(dateType, true);
  const base: Record<string, string | number | undefined> = {
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

  const windows = args.startDate && args.endDate
    ? splitDateWindows(args.startDate, args.endDate, MAX_WINDOW_DAYS)
    : [{ bgn: undefined as string | undefined, end: undefined as string | undefined }];
  const pageSize = args.pageSize ?? 100;
  const maxPages = args.maxPages ?? 10;

  const settled = await Promise.allSettled(kinds.map(async (kind) => {
    const items: AwardResult[] = [];
    let totalCount = 0, truncated = false;
    for (const w of windows) {
      const params = { ...base, inqryBgnDt: w.bgn, inqryEndDt: w.end };
      const r = await fetchAllPages((op, p) => client.call(op, p), awardSearchOp(kind), params, { pageSize, maxPages });
      items.push(...r.items.map(formatAward));
      totalCount += r.totalCount;
      truncated = truncated || r.truncated;
    }
    return { totalCount, items, truncated };
  }));

  const results: Partial<Record<BidKind, KindResult>> = {};
  kinds.forEach((kind, i) => {
    const s = settled[i]!;
    results[kind] = s.status === "fulfilled" ? s.value : { error: s.reason instanceof Error ? s.reason.message : String(s.reason) };
  });
  return {
    query: args, results,
    notes: [
      "낙찰자만 조회한다(그 업체가 참여했으나 진 입찰은 이 API로 도달 불가).",
      "여러 창(주 단위 분할)의 totalCount 합은 창별 합계다.",
    ],
  };
}
