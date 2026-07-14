import { z } from "zod";
import {
  splitCalendarMonths, fanOut,
  type DataGoKrClient, type FailedWindow, type Params,
} from "@opendata-kr/core";
import { ALL_BID_KINDS, openingSearchOp, openingInqryDiv, type BidKind, type DateType } from "../api/endpoints.js";
import { RawOpeningSchema, type RawOpening } from "../api/schema.js";
import { formatOpening, failReasonHint } from "../format.js";
import type { OpeningSummary } from "../api/types.js";

export const searchOpeningsInputShape = {
  bidKind: z.array(z.enum(["cnstwk", "servc", "thng", "frgcpt"])).optional().describe("업무구분 배열(cnstwk=공사·servc=용역·thng=물품·frgcpt=외자). 미지정 시 전 구분 병렬 조회로 API 요청이 4배로 늘어난다. 업무구분을 알면 지정해 인증키 일일 트래픽을 아낀다"),
  keyword: z.string().optional().describe("공고명(bidNtceNm)"),
  institution: z.string().optional().describe("공고기관명"),
  demandInstitution: z.string().optional().describe("수요기관명(dminsttNm)"),
  region: z.string().optional().describe("참가제한지역명(prtcptLmtRgnNm, 예: 인천광역시)"),
  industry: z.string().optional().describe("업종명(indstrytyNm)"),
  status: z.enum(["개찰완료", "유찰", "재입찰"]).optional().describe("진행상태 필터(응답 progrsDivCdNm 기준 클라이언트 필터)"),
  startDate: z.string().optional().describe("조회 시작일 YYYYMMDD (endDate와 함께 지정)"),
  endDate: z.string().optional().describe("조회 종료일 YYYYMMDD (startDate와 함께 지정)"),
  dateType: z.enum(["posted", "opened"]).optional().describe("날짜 기준: posted=공고게시(기본), opened=개찰"),
  pageSize: z.number().int().min(1).max(100).optional().describe("창당 페이지 크기(기본 20, 개찰결과는 느려 작게 권장)"),
  maxPages: z.number().int().min(1).max(50).optional().describe("창당 최대 페이지(기본 5)"),
};

// inputSchema에서 파생해 shape와 타입의 원천을 하나로 유지한다(수동 중복·드리프트 방지).
export type SearchOpeningsArgs = z.infer<z.ZodObject<typeof searchOpeningsInputShape>>;

type KindResult =
  | { totalCountBeforeFilter: number; filteredCount: number; invalidCount: number; items: OpeningSummary[]; truncated: boolean; failedWindows: FailedWindow[] }
  | { error: string };
export interface SearchOpeningsResult { query: SearchOpeningsArgs; results: Partial<Record<BidKind, KindResult>>; notes: string[]; }

export async function runSearchOpenings(client: DataGoKrClient, args: SearchOpeningsArgs): Promise<SearchOpeningsResult> {
  if ((args.startDate && !args.endDate) || (!args.startDate && args.endDate)) {
    throw new Error("startDate와 endDate는 함께 지정해야 합니다.");
  }
  if (args.startDate && args.endDate && args.startDate > args.endDate) {
    throw new Error("startDate가 endDate보다 늦습니다.");
  }

  const kinds = args.bidKind ?? [...ALL_BID_KINDS];
  const dateType: DateType = args.dateType ?? "posted";
  const inqryDiv = openingInqryDiv(dateType, true);
  const base: Params = {
    inqryDiv, bidNtceNm: args.keyword, ntceInsttNm: args.institution, dminsttNm: args.demandInstitution,
    prtcptLmtRgnNm: args.region, indstrytyNm: args.industry,
  };
  // 개찰결과(계열 B)는 응답이 무겁고 느려 큰 페이지는 타임아웃한다(라이브: 20행 0.6초, 50행 9초, 100행 타임아웃).
  // 기본 페이지를 작게 두고, window는 순차(concurrency 1)로 처리해 동시 부하를 막는다.
  const pageSize = args.pageSize ?? 20, maxPages = args.maxPages ?? 5;

  const task = async (kind: BidKind): Promise<Exclude<KindResult, { error: string }>> => {
    let raw: OpeningSummary[] = [];
    let totalCountBeforeFilter = 0, invalidCount = 0, truncated = false;
    let failedWindows: FailedWindow[] = [];
    const toSummary = (data: RawOpening[]) =>
      data.map((r) => {
        const o = formatOpening(r);
        if (o.progress === "유찰") o.failReasonHint = failReasonHint(o.participants);
        return o;
      });
    if (args.startDate && args.endDate) {
      const w = await client.paginateWindows(openingSearchOp(kind), {
        params: base, schema: RawOpeningSchema,
        windows: splitCalendarMonths(args.startDate, args.endDate),
        pageSize, maxPages, concurrency: 1,
      });
      raw = toSummary(w.data); totalCountBeforeFilter = w.totalCount; invalidCount = w.invalid.length;
      truncated = w.truncated; failedWindows = w.failedWindows;
    } else {
      const p = await client.paginate(openingSearchOp(kind), { params: base, schema: RawOpeningSchema, pageSize, maxPages });
      raw = toSummary(p.data); totalCountBeforeFilter = p.totalCount; invalidCount = p.invalid.length; truncated = p.truncated;
    }
    const items = args.status ? raw.filter((o) => o.progress === args.status) : raw;
    return { totalCountBeforeFilter, filteredCount: items.length, invalidCount, items, truncated, failedWindows };
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
      "status는 응답 progrsDivCdNm 기준 클라이언트 필터다(API 요청 파라미터 아님). totalCountBeforeFilter는 필터 전 값.",
      "재입찰은 동일 공고 내 재입찰이며 재공고가 아니다(재공고는 입찰공고 서비스 소관).",
      "개찰결과 조회는 응답이 느리다. 페이지 크기를 작게(기본 20) 유지하고 검색조건(기관·업종·기간)을 좁혀 쓴다.",
      "여러 창은 캘린더 월 경계로 분할하며 창은 순차 조회한다. 일부 창이 실패하면 failedWindows에 담기고 나머지 성공분은 반환한다(부분 결과일 수 있음).",
      "invalidCount는 응답 스키마 검증에서 탈락해 items에서 제외된 건수다(0이 아니면 API 응답 드리프트 신호).",
    ],
  };
}
