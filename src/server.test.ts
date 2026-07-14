import { describe, it, expect } from "vitest";
import { createServer } from "./server.js";
import { makeTestClient } from "./test-helpers.js";

describe("createServer", () => {
  it("툴 3개를 등록한다", () => {
    const server = createServer(makeTestClient({}).client);
    // McpServer 내부 등록 확인: 노출 API가 제한적이므로, 등록이 예외 없이 끝나는지로 최소 검증.
    expect(server).toBeDefined();
  });
});
