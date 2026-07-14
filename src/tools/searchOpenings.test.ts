import { describe, it, expect } from "vitest";
import { openingSearchOp } from "../api/endpoints.js";
import { makeTestClient } from "../test-helpers.js";
import { runSearchOpenings } from "./searchOpenings.js";

describe("runSearchOpenings", () => {
  it("status는 클라이언트 필터(progrsDivCdNm), 필터 전후 건수 구분", async () => {
    const { client } = makeTestClient({
      [openingSearchOp("thng")]: {
        totalCount: 2,
        items: [
          { bidNtceNo: "N1", progrsDivCdNm: "유찰", prtcptCnum: "1", opengCorpInfo: "" },
          { bidNtceNo: "N2", progrsDivCdNm: "개찰완료", prtcptCnum: "3", opengCorpInfo: "A^1^김^100^99" },
        ],
      },
    });
    const r = await runSearchOpenings(client, {
      bidKind: ["thng"],
      status: "유찰",
      startDate: "20260601",
      endDate: "20260601",
    });
    const t = r.results.thng!;
    if ("error" in t) throw new Error(t.error);
    expect(t.totalCountBeforeFilter).toBe(2);
    expect(t.filteredCount).toBe(1);
    expect(t.invalidCount).toBe(0);
    expect(t.items[0]!.progress).toBe("유찰");
    expect(t.items[0]!.failReasonHint).toContain("단독응찰");
  });

  it("startDate/endDate 한쪽만 주면 에러", async () => {
    const { client } = makeTestClient({});
    await expect(runSearchOpenings(client, { startDate: "20260601" })).rejects.toThrow(/함께 지정/);
  });

  it("startDate가 endDate보다 늦으면 에러", async () => {
    const { client } = makeTestClient({});
    await expect(runSearchOpenings(client, { startDate: "20260607", endDate: "20260601" })).rejects.toThrow(/늦/);
  });

  it("부분 실패는 error로 표면화", async () => {
    const { client } = makeTestClient({
      [openingSearchOp("cnstwk")]: { errorCode: "99", errorMsg: "boom" },
    });
    const r = await runSearchOpenings(client, { bidKind: ["thng", "cnstwk"] });
    expect("error" in r.results.cnstwk!).toBe(true);
    expect("items" in r.results.thng!).toBe(true);
  });

  it("무날짜 검색은 paginate 경로로 0건이 아니다", async () => {
    const { client, requests } = makeTestClient({
      [openingSearchOp("cnstwk")]: { items: [{ bidNtceNo: "1", progrsDivCdNm: "개찰완료" }], totalCount: 1 },
    });
    const r = await runSearchOpenings(client, { bidKind: ["cnstwk"] });
    const cnstwk = r.results.cnstwk;
    expect(cnstwk && "items" in cnstwk ? cnstwk.items.length : -1).toBe(1);
    expect(requests.length).toBeGreaterThan(0); // 무날짜여도 호출 발생
  });

  it("window 부분실패는 failedWindows로 표면화되고 kind는 성공 유지", async () => {
    const { client } = makeTestClient({
      [openingSearchOp("cnstwk")]: (params) =>
        params.get("inqryBgnDt")?.startsWith("202602")
          ? { errorCode: "99", errorMsg: "타임아웃" }
          : { items: [{ bidNtceNo: "1", progrsDivCdNm: "개찰완료" }], totalCount: 1 },
    });
    const r = await runSearchOpenings(client, { bidKind: ["cnstwk"], startDate: "20260115", endDate: "20260310" });
    const cnstwk = r.results.cnstwk;
    if (!cnstwk || "error" in cnstwk) throw new Error("kind가 통째 실패하면 안 됨");
    expect(cnstwk.failedWindows.length).toBe(1);
    expect(cnstwk.failedWindows[0]!.window.bgn.startsWith("202602")).toBe(true);
    expect(cnstwk.items.length).toBe(2); // 1월·3월 window 성공분
  });
});
