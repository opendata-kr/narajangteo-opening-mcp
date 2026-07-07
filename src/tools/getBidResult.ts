import { z } from "zod";
import type { DataGoKrClient, RawItem } from "@opendata-kr/core";
import {
  ALL_BID_KINDS, ALL_OPENING_STATUS, awardListOp, openingListOp, preparPriceOp,
  D_OPERATION, awardInqryDiv, openingInqryDiv, type BidKind, type OpeningStatus,
} from "../api/endpoints.js";
import {
  formatAward, formatOpening, formatBidder, aggregatePreparPrice, estimateAwardMethod, compositeKeyOf,
} from "../format.js";
import type { AwardResult, OpeningSummary, PreparPriceDetail, BidderDetail } from "../api/types.js";

export const getBidResultInputShape = {
  bidNtceNo: z.string().describe("입찰공고번호"),
  bidKind: z.enum(["cnstwk", "servc", "thng", "frgcpt"]).optional().describe("업무구분. 미지정 시 A/B/C를 전 구분에서 조회"),
  status: z.enum(["completed", "failing", "rebid", "all"]).optional().describe("D 상태(기본 all: 완료·유찰·재입찰 병렬)"),
};
export type GetBidResultArgs = { bidNtceNo: string; bidKind?: BidKind; status?: "completed" | "failing" | "rebid" | "all" };

export interface Execution {
  bidNtceOrd: string; bidClsfcNo: string; rbidNo: string;
  awardMethod: { method: "negotiated" | "qualification_or_other"; uncertain: true };
  award: AwardResult | null; opening: OpeningSummary | null;
  preparPrice: PreparPriceDetail | null; bidders: BidderDetail[];
}
export interface GetBidResultResult { bidNtceNo: string; executions: Execution[]; errors: string[]; notes: string[]; }

async function safeItems(client: DataGoKrClient, op: string, params: Record<string, string | number | undefined>, errors: string[]): Promise<RawItem[]> {
  try { return (await client.call(op, { ...params, pageNo: 1, numOfRows: 100 })).items; }
  catch (e) { errors.push(`${op}: ${e instanceof Error ? e.message : String(e)}`); return []; }
}

export async function runGetBidResult(client: DataGoKrClient, args: GetBidResultArgs): Promise<GetBidResultResult> {
  const errors: string[] = [];
  const kinds: BidKind[] = args.bidKind ? [args.bidKind] : [...ALL_BID_KINDS];
  const statuses: OpeningStatus[] = !args.status || args.status === "all" ? [...ALL_OPENING_STATUS] : [args.status];
  const no = args.bidNtceNo;

  // A/B/C: 업무구분 병렬 시도(inqryDiv=공고번호). D: 상태 오퍼레이션 병렬.
  const aRaw: RawItem[] = [], bRaw: RawItem[] = [], cRaw: RawItem[] = [], dRaw: RawItem[] = [];
  await Promise.all([
    ...kinds.map(async (k) => { aRaw.push(...await safeItems(client, awardListOp(k), { inqryDiv: awardInqryDiv("notice", false), bidNtceNo: no }, errors)); }),
    ...kinds.map(async (k) => { bRaw.push(...await safeItems(client, openingListOp(k), { inqryDiv: openingInqryDiv("notice", false), bidNtceNo: no }, errors)); }),
    ...kinds.map(async (k) => { cRaw.push(...await safeItems(client, preparPriceOp(k), { inqryDiv: "2", bidNtceNo: no }, errors)); }),
    ...statuses.map(async (s) => { dRaw.push(...await safeItems(client, D_OPERATION[s], { bidNtceNo: no }, errors)); }),
  ]);

  // 복합키로 집행 그룹핑
  const keys = new Set<string>();
  for (const r of [...aRaw, ...bRaw, ...cRaw, ...dRaw]) keys.add(compositeKeyOf(r));

  const executions: Execution[] = [...keys].map((key) => {
    const match = (r: RawItem) => compositeKeyOf(r) === key;
    const [, ord = "", clsfc = "", rbid = ""] = key.split("|");
    const a = aRaw.find(match), b = bRaw.find(match);
    const cItems = cRaw.filter(match), dItems = dRaw.filter(match);
    const bidders = dItems.map(formatBidder);
    return {
      bidNtceOrd: ord, bidClsfcNo: clsfc, rbidNo: rbid,
      awardMethod: estimateAwardMethod(bidders),
      award: a ? formatAward(a) : null,
      opening: b ? formatOpening(b) : null,
      preparPrice: cItems.length ? aggregatePreparPrice(cItems) : null,
      bidders,
    };
  });

  return {
    bidNtceNo: no, executions, errors,
    notes: [
      "A/B/C/D를 복합키(공고번호+차수+분류+재입찰번호)로 조인한다. 다분류·다차수는 집행 단위로 분리된다.",
      "낙찰방식 구분 필드가 API에 없어 점수 채움으로 추정한다(uncertain). 협상계약이 아니면 세부심사점수는 제공되지 않는다.",
    ],
  };
}
