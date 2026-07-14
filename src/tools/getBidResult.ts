import { z } from "zod";
import { errMessage, type DataGoKrClient, type Params, type StandardSchemaV1 } from "@opendata-kr/core";
import {
  ALL_BID_KINDS, ALL_OPENING_STATUS, awardListOp, openingListOp, preparPriceOp,
  D_OPERATION, awardInqryDiv, openingInqryDiv, preparInqryDiv, type BidKind, type OpeningStatus,
} from "../api/endpoints.js";
import {
  RawAwardSchema, RawOpeningSchema, RawPreparPriceSchema, RawBidderSchema,
  type CompositeSource, type RawAward, type RawOpening, type RawPreparPrice, type RawBidder,
} from "../api/schema.js";
import {
  formatAward, formatOpening, formatBidder, aggregatePreparPrice, estimateAwardMethod, compositeKeyOf,
} from "../format.js";
import type { AwardResult, OpeningSummary, PreparPriceDetail, BidderDetail } from "../api/types.js";

export const getBidResultInputShape = {
  bidNtceNo: z.string().describe("입찰공고번호"),
  bidKind: z.enum(["cnstwk", "servc", "thng", "frgcpt"]).optional().describe("업무구분. 미지정 시 A/B/C를 전 구분에서 조회해 API 요청이 12건으로 늘어난다(지정 시 3건). 업무구분을 알면 지정해 인증키 일일 트래픽을 아낀다"),
  status: z.enum(["completed", "failing", "rebid", "all"]).optional().describe("D 상태(기본 all: 완료·유찰·재입찰 병렬, API 요청 3건. 상태를 알면 지정해 1건으로 줄인다)"),
  bidNtceOrd: z.string().optional().describe("입찰공고차수. 특정 집행으로 좁힘"),
  bidClsfcNo: z.string().optional().describe("입찰분류번호. 특정 집행으로 좁힘"),
  rbidNo: z.string().optional().describe("재입찰번호. 특정 집행으로 좁힘"),
  myBizno: z.string().optional().describe("자사 사업자번호. 일치하는 투찰행에 isOurs 플래그"),
};

// inputSchema에서 파생해 shape와 타입의 원천을 하나로 유지한다(수동 중복·드리프트 방지).
export type GetBidResultArgs = z.infer<z.ZodObject<typeof getBidResultInputShape>>;

export interface Execution {
  bidNtceOrd: string; bidClsfcNo: string; rbidNo: string;
  awardMethod: { method: "negotiated" | "qualification_or_other"; uncertain: true };
  award: AwardResult | null; opening: OpeningSummary | null;
  preparPrice: PreparPriceDetail | null; bidders: BidderDetail[];
}
export interface GetBidResultResult {
  bidNtceNo: string; executions: Execution[]; errors: string[]; invalidCount: number; notes: string[];
}

// 계열별 스키마로 검증해 통과분만 반환한다. 실패는 errors, 스키마 탈락은 invalid 카운터로 격리.
async function safeData<Raw>(
  client: DataGoKrClient,
  op: string,
  params: Params,
  schema: StandardSchemaV1<unknown, Raw>,
  errors: string[],
  invalid: { count: number },
): Promise<Raw[]> {
  try {
    const r = await client.get(op, { params: { ...params, pageNo: 1, numOfRows: 100 }, schema });
    invalid.count += r.invalid.length;
    return r.data;
  } catch (e) {
    errors.push(`${op}: ${errMessage(e)}`);
    return [];
  }
}

export async function runGetBidResult(client: DataGoKrClient, args: GetBidResultArgs): Promise<GetBidResultResult> {
  const errors: string[] = [];
  const invalid = { count: 0 };
  const kinds: BidKind[] = args.bidKind ? [args.bidKind] : [...ALL_BID_KINDS];
  const statuses: OpeningStatus[] = !args.status || args.status === "all" ? [...ALL_OPENING_STATUS] : [args.status];
  const notice = args.bidNtceNo;

  // A/B/C: 업무구분 병렬 시도(inqryDiv=공고번호). D: 상태 오퍼레이션 병렬.
  const aRaw: RawAward[] = [], bRaw: RawOpening[] = [], cRaw: RawPreparPrice[] = [], dRaw: RawBidder[] = [];
  await Promise.all([
    ...kinds.map(async (k) => { aRaw.push(...await safeData(client, awardListOp(k), { inqryDiv: awardInqryDiv("notice", false), bidNtceNo: notice }, RawAwardSchema, errors, invalid)); }),
    ...kinds.map(async (k) => { bRaw.push(...await safeData(client, openingListOp(k), { inqryDiv: openingInqryDiv("notice", false), bidNtceNo: notice }, RawOpeningSchema, errors, invalid)); }),
    ...kinds.map(async (k) => { cRaw.push(...await safeData(client, preparPriceOp(k), { inqryDiv: preparInqryDiv(true), bidNtceNo: notice }, RawPreparPriceSchema, errors, invalid)); }),
    ...statuses.map(async (s) => { dRaw.push(...await safeData(client, D_OPERATION[s], { bidNtceNo: notice }, RawBidderSchema, errors, invalid)); }),
  ]);

  // 복합키로 집행 그룹핑
  const keys = new Set<string>();
  for (const r of [...aRaw, ...bRaw, ...cRaw, ...dRaw]) keys.add(compositeKeyOf(r));

  const executions: Execution[] = [...keys].map((key) => {
    const match = (r: CompositeSource) => compositeKeyOf(r) === key;
    const [, ord = "", clsfc = "", rbid = ""] = key.split("|");
    const a = aRaw.find(match), b = bRaw.find(match);
    const cItems = cRaw.filter(match), dItems = dRaw.filter(match);
    const bidders = dItems.map(formatBidder).map((b) =>
      args.myBizno && b.bizno === args.myBizno ? { ...b, isOurs: true } : b);
    return {
      bidNtceOrd: ord, bidClsfcNo: clsfc, rbidNo: rbid,
      awardMethod: estimateAwardMethod(bidders),
      award: a ? formatAward(a) : null,
      opening: b ? formatOpening(b) : null,
      preparPrice: cItems.length ? aggregatePreparPrice(cItems) : null,
      bidders,
    };
  });

  let filtered = executions;
  if (args.bidNtceOrd !== undefined || args.bidClsfcNo !== undefined || args.rbidNo !== undefined) {
    filtered = executions.filter((e) =>
      (args.bidNtceOrd === undefined || e.bidNtceOrd === args.bidNtceOrd) &&
      (args.bidClsfcNo === undefined || e.bidClsfcNo === args.bidClsfcNo) &&
      (args.rbidNo === undefined || e.rbidNo === args.rbidNo));
  }

  return {
    bidNtceNo: notice, executions: filtered, errors, invalidCount: invalid.count,
    notes: [
      "A/B/C/D를 복합키(공고번호+차수+분류+재입찰번호)로 조인한다. 다분류·다차수는 집행 단위로 분리된다.",
      "낙찰방식 구분 필드가 API에 없어 점수 채움으로 추정한다(uncertain). 협상계약이 아니면 세부심사점수는 제공되지 않는다.",
      "invalidCount는 응답 스키마 검증에서 탈락해 제외된 item 건수 합계다(0이 아니면 API 응답 드리프트 신호).",
    ],
  };
}
