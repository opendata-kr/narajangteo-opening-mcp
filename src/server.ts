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
    description: "나라장터 낙찰 결과(최종낙찰자)를 검색한다. 공고명·기관·수요기관(코드)·지역·업종·추정가·사업자번호·기간으로 필터. 업무구분 미지정 시 전 구분 병렬. 낙찰자만 조회하며 진 입찰은 미포함.",
    inputSchema: searchAwardsInputShape,
  }, async (args) => {
    try { return textResult(await runSearchAwards(client, args as SearchAwardsArgs)); }
    catch (e) { return textResult({ error: e instanceof Error ? e.message : String(e) }, true); }
  });

  server.registerTool("search_openings", {
    description: "나라장터 개찰결과 목록을 검색한다. 진행상태(개찰완료/유찰/재입찰) 필터로 유찰·재입찰 공고를 발굴. 재입찰은 동일 공고 내 재입찰이며 재공고가 아니다.",
    inputSchema: searchOpeningsInputShape,
  }, async (args) => {
    try { return textResult(await runSearchOpenings(client, args as SearchOpeningsArgs)); }
    catch (e) { return textResult({ error: e instanceof Error ? e.message : String(e) }, true); }
  });

  server.registerTool("get_bid_result", {
    description: "입찰공고번호로 낙찰자·개찰진행·예비가격상세·투찰업체별 순위/금액/점수를 복합키 정합으로 단건 조회. 다분류·다차수는 집행 단위로 분리. 낙찰방식은 추정.",
    inputSchema: getBidResultInputShape,
  }, async (args) => {
    try { return textResult(await runGetBidResult(client, args as GetBidResultArgs)); }
    catch (e) { return textResult({ error: e instanceof Error ? e.message : String(e) }, true); }
  });

  return server;
}
