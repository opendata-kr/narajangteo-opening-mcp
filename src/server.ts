import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DataGoKrClient } from "@opendata-kr/core";
import { VERSION } from "./version.js";
import { searchAwardsInputShape, runSearchAwards, type SearchAwardsArgs } from "./tools/searchAwards.js";
import { searchOpeningsInputShape, runSearchOpenings, type SearchOpeningsArgs } from "./tools/searchOpenings.js";
import { getBidResultInputShape, runGetBidResult, type GetBidResultArgs } from "./tools/getBidResult.js";

function textResult(payload: unknown, isError = false) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }], ...(isError ? { isError: true } : {}) };
}

export function createServer(client: DataGoKrClient): McpServer {
  const server = new McpServer({ name: "narajangteo-opening-mcp", version: VERSION });

  server.registerTool("search_awards", {
    title: "낙찰 결과 검색",
    description:
      "나라장터 낙찰 결과(최종낙찰자)를 공고명·기관·수요기관(코드)·지역·업종·추정가·사업자번호·기간으로 검색한다. '누가 얼마에 낙찰받았나', 경쟁사(bizno) 낙찰 이력, 되풀이 사업의 종단 조회에 쓴다. 특정 공고의 개찰·투찰업체·예비가 상세는 get_bid_result, 개찰 진행·유찰 발굴은 search_openings를 쓴다. 업무구분 미지정 시 물품/공사/용역/외자를 병렬 조회한다. 낙찰자만 반환하며 그 업체가 참여했으나 진 입찰은 미포함.",
    inputSchema: searchAwardsInputShape,
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, async (args) => {
    try { return textResult(await runSearchAwards(client, args as SearchAwardsArgs)); }
    catch (e) { return textResult({ error: e instanceof Error ? e.message : String(e) }, true); }
  });

  server.registerTool("search_openings", {
    title: "개찰결과 검색",
    description:
      "나라장터 개찰결과 목록을 검색하고 진행상태(개찰완료/유찰/재입찰)로 필터한다. 유찰·재입찰 공고 발굴에 쓴다. 최종낙찰자 검색은 search_awards, 단일 공고 상세는 get_bid_result를 쓴다. status는 API가 아니라 응답 기준 클라이언트 필터라 응답이 느리니 기관·업종·기간으로 좁혀 쓴다(truncated=true면 미완 스캔). 재입찰은 동일 공고 내 재입찰이며 재공고가 아니다(재공고는 입찰공고 서비스 소관).",
    inputSchema: searchOpeningsInputShape,
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, async (args) => {
    try { return textResult(await runSearchOpenings(client, args as SearchOpeningsArgs)); }
    catch (e) { return textResult({ error: e instanceof Error ? e.message : String(e) }, true); }
  });

  server.registerTool("get_bid_result", {
    title: "공고 개찰 상세",
    description:
      "입찰공고번호로 그 공고의 낙찰자·개찰진행·예비가격상세(사정률)·투찰업체별 순위/금액/점수를 복합키 정합으로 단건 조회한다. 딜 사후분석·투찰가 참고에 쓴다. 여러 공고를 조건으로 찾으려면 search_awards 또는 search_openings를 쓴다. 다분류·다차수 공고는 집행 단위 배열로 분리한다. 낙찰방식은 추정이며(협상계약만 기술·가격 점수 제공, 적격심사는 금액·순위만), myBizno를 주면 자사 투찰행에 isOurs를 표시한다.",
    inputSchema: getBidResultInputShape,
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, async (args) => {
    try { return textResult(await runGetBidResult(client, args as GetBidResultArgs)); }
    catch (e) { return textResult({ error: e instanceof Error ? e.message : String(e) }, true); }
  });

  return server;
}
