import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DataGoKrClient } from "@opendata-kr/core";
import { VERSION } from "./version.js";

// 골격: 빌드·부팅만 보장한다.
// 툴(search_awards, search_openings, get_bid_result)은 구현 계획에서 registerTool로 등록한다.
export function createServer(_client: DataGoKrClient): McpServer {
  const server = new McpServer({
    name: "narajangteo-opening-mcp",
    version: VERSION,
  });

  return server;
}
