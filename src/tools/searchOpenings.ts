import { z } from "zod";
import type { DataGoKrClient } from "@opendata-kr/core";
import { ALL_BID_KINDS, openingSearchOp, openingInqryDiv, type BidKind, type DateType } from "../api/endpoints.js";
import { splitDateWindows, fetchAllPages, MAX_WINDOW_DAYS } from "../api/dateWindow.js";
import { formatOpening, failReasonHint } from "../format.js";
import type { OpeningSummary } from "../api/types.js";

const STATUS_LABEL = { completed: "개찰완료", failing: "유찰", rebid: "재입찰" } as const;

export const searchOpeningsInputShape = {
  bidKind: z.array(z.enum(["cnstwk", "servc", "thng", "frgcpt"])).optional(),
  keyword: z.string().optional().describe("공고명(bidNtceNm)"),
  institution: z.string().optional().describe("공고기관명"),
  demandInstitution: z.string().optional(),
  region: z.string().optional(),
  industry: z.string().optional(),
  status: z.enum(["개찰완료", "유찰", "재입찰"]).optional().describe("진행상태 필터(응답 progrsDivCdNm 기준 클라이언트 필터)"),
  startDate: z.string().optional(), endDate: z.string().optional(),
  dateType: z.enum(["posted", "opened"]).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  maxPages: z.number().int().min(1).max(50).optional(),
};

export type SearchOpeningsArgs = {
  bidKind?: BidKind[]; keyword?: string; institution?: string; demandInstitution?: string;
  region?: string; industry?: string; status?: "개찰완료" | "유찰" | "재입찰";
  startDate?: string; endDate?: string; dateType?: "posted" | "opened"; pageSize?: number; maxPages?: number;
};

type KindResult = { totalCountBeforeFilter: number; filteredCount: number; items: OpeningSummary[]; truncated: boolean } | { error: string };
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
  const base: Record<string, string | number | undefined> = {
    inqryDiv, bidNtceNm: args.keyword, ntceInsttNm: args.institution, dminsttNm: args.demandInstitution,
    prtcptLmtRgnNm: args.region, indstrytyNm: args.industry,
  };
  const windows = args.startDate && args.endDate
    ? splitDateWindows(args.startDate, args.endDate, MAX_WINDOW_DAYS)
    : [{ bgn: undefined as string | undefined, end: undefined as string | undefined }];
  // 개찰결과(계열 B)는 응답이 무겁고 느려 큰 페이지는 타임아웃한다(라이브: 20행 0.6초, 50행 9초, 100행 타임아웃).
  // 기본 페이지를 작게 둔다.
  const pageSize = args.pageSize ?? 20, maxPages = args.maxPages ?? 5;

  const settled = await Promise.allSettled(kinds.map(async (kind) => {
    const all: OpeningSummary[] = [];
    let before = 0, truncated = false;
    for (const w of windows) {
      const r = await fetchAllPages((op, p) => client.call(op, p), openingSearchOp(kind), { ...base, inqryBgnDt: w.bgn, inqryEndDt: w.end }, { pageSize, maxPages });
      before += r.totalCount; truncated = truncated || r.truncated;
      for (const raw of r.items) {
        const o = formatOpening(raw);
        if (o.progress === "유찰") o.failReasonHint = failReasonHint(o.participants);
        all.push(o);
      }
    }
    const items = args.status ? all.filter((o) => o.progress === args.status) : all;
    return { totalCountBeforeFilter: before, filteredCount: items.length, items, truncated };
  }));

  const results: Partial<Record<BidKind, KindResult>> = {};
  kinds.forEach((kind, i) => {
    const s = settled[i]!;
    results[kind] = s.status === "fulfilled" ? s.value : { error: s.reason instanceof Error ? s.reason.message : String(s.reason) };
  });
  return {
    query: args, results,
    notes: [
      "status는 응답 progrsDivCdNm 기준 클라이언트 필터다(API 요청 파라미터 아님). totalCountBeforeFilter는 필터 전 값.",
      "재입찰은 동일 공고 내 재입찰이며 재공고가 아니다(재공고는 입찰공고 서비스 소관).",
      "개찰결과 조회는 응답이 느리다. 페이지 크기를 작게(기본 20) 유지하고 검색조건(기관·업종·기간)을 좁혀 쓴다.",
    ],
  };
}
