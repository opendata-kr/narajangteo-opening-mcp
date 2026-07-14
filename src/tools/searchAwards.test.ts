import { describe, it, expect } from "vitest";
import { awardSearchOp } from "../api/endpoints.js";
import { makeTestClient } from "../test-helpers.js";
import { runSearchAwards } from "./searchAwards.js";

describe("runSearchAwards", () => {
  it("업무구분 지정 시 해당 구분만, 낙찰자 요약 반환", async () => {
    const { client } = makeTestClient({
      [awardSearchOp("thng")]: { items: [{ bidNtceNo: "R25BK1", bidwinnrNm: "A사", sucsfbidRate: "97.8" }], totalCount: 1 },
    });
    const r = await runSearchAwards(client, { bidKind: ["thng"], keyword: "센터", startDate: "20260601", endDate: "20260607" });
    const thng = r.results.thng!;
    if ("error" in thng) throw new Error(thng.error);
    expect(thng.items[0]!.winner).toBe("A사");
    expect(thng.invalidCount).toBe(0);
    expect(r.notes.some(n => /낙찰자만/.test(n))).toBe(true);
  });

  it("부분 실패는 error로 표면화", async () => {
    const { client } = makeTestClient({
      [awardSearchOp("cnstwk")]: { errorCode: "99", errorMsg: "boom" },
    });
    const r = await runSearchAwards(client, { bidKind: ["thng", "cnstwk"] });
    expect("error" in r.results.cnstwk!).toBe(true);
    expect("items" in r.results.thng!).toBe(true);
  });

  it("startDate/endDate 한쪽만 주면 에러", async () => {
    const { client } = makeTestClient({});
    await expect(runSearchAwards(client, { startDate: "20260601" })).rejects.toThrow(/함께 지정/);
  });

  it("startDate가 endDate보다 늦으면 에러", async () => {
    const { client } = makeTestClient({});
    await expect(runSearchAwards(client, { startDate: "20260607", endDate: "20260601" })).rejects.toThrow(/늦/);
  });

  it("무날짜 검색은 paginate 경로로 0건이 아니다", async () => {
    const { client, requests } = makeTestClient({
      [awardSearchOp("cnstwk")]: { items: [{ bidNtceNo: "1" }], totalCount: 1 },
    });
    const r = await runSearchAwards(client, { bidKind: ["cnstwk"] });
    const cnstwk = r.results.cnstwk;
    expect(cnstwk && "items" in cnstwk ? cnstwk.items.length : -1).toBe(1);
    expect(requests.length).toBeGreaterThan(0); // 무날짜여도 호출 발생
  });

  it("window 부분실패는 failedWindows로 표면화", async () => {
    const { client } = makeTestClient({
      [awardSearchOp("cnstwk")]: (params) =>
        params.get("inqryBgnDt")?.startsWith("202602")
          ? { errorCode: "99", errorMsg: "타임아웃" }
          : { items: [{ bidNtceNo: "1" }], totalCount: 1 },
    });
    const r = await runSearchAwards(client, { bidKind: ["cnstwk"], startDate: "20260115", endDate: "20260310" });
    const cnstwk = r.results.cnstwk;
    if (!cnstwk || "error" in cnstwk) throw new Error("kind가 통째 실패하면 안 됨");
    expect(cnstwk.failedWindows.length).toBe(1);
    expect(cnstwk.failedWindows[0]!.window.bgn.startsWith("202602")).toBe(true);
    expect(cnstwk.items.length).toBe(2); // 1월·3월 window 성공분
  });

  it("스키마 탈락 item은 items에서 빠지고 invalidCount로 집계된다", async () => {
    const { client } = makeTestClient({
      [awardSearchOp("thng")]: { items: [{ bidNtceNo: "R1" }, { bidwinnrNm: "공고번호 없는 행" }], totalCount: 2 },
    });
    const r = await runSearchAwards(client, { bidKind: ["thng"] });
    const thng = r.results.thng!;
    if ("error" in thng) throw new Error(thng.error);
    expect(thng.items.length).toBe(1);
    expect(thng.invalidCount).toBe(1);
  });
});
