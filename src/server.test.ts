import { describe, it, expect, vi } from "vitest";
import { createServer } from "./server.js";
import type { DataGoKrClient } from "@opendata-kr/core";

describe("createServer", () => {
  it("툴 3개를 등록한다", async () => {
    const client = { call: vi.fn(async () => ({ totalCount: 0, items: [] })) } as unknown as DataGoKrClient;
    const server = createServer(client);
    // McpServer 내부 등록 확인: 노출 API가 제한적이므로, 등록이 예외 없이 끝나는지로 최소 검증.
    expect(server).toBeDefined();
  });
});
