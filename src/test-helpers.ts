import dataGoKr, { type DataGoKrClient } from "@opendata-kr/core";

// 오퍼레이션별 응답 스텁: 정상 items, data.go.kr 오류 봉투, 또는 요청 파라미터를 보고 정하는 함수.
export type OpResponse =
  | { items: Record<string, unknown>[]; totalCount?: number }
  | { errorCode: string; errorMsg?: string };
export type OpStub = OpResponse | ((params: URLSearchParams) => OpResponse);

export interface SeenRequest {
  op: string;
  params: URLSearchParams;
}

export interface TestClient {
  client: DataGoKrClient;
  requests: SeenRequest[];
}

// 가짜 클라이언트 객체 대신 실제 core 클라이언트에 fetch만 주입해, 봉투 정규화·스키마 검증·
// 기본 키 힌트 인터셉터까지 실 파이프라인을 테스트가 통과하게 한다.
// 스텁은 URL 마지막 경로 세그먼트(오퍼레이션명) 완전 일치로 고르고, 미등록 오퍼레이션은 빈 정상 응답이다.
export function makeTestClient(
  perOp: Record<string, OpStub>,
  opts: { serviceKey?: string } = {},
): TestClient {
  const requests: SeenRequest[] = [];
  const fetchFn: typeof fetch = async (input) => {
    const url = new URL(String(input));
    const op = url.pathname.split("/").pop() ?? "";
    requests.push({ op, params: url.searchParams });
    const stub = perOp[op];
    const res = typeof stub === "function" ? stub(url.searchParams) : stub;
    const envelope =
      res && "errorCode" in res
        ? {
            response: {
              header: { resultCode: res.errorCode, resultMsg: res.errorMsg ?? "오류" },
            },
          }
        : {
            response: {
              header: { resultCode: "00", resultMsg: "정상" },
              body: {
                items: res?.items ?? [],
                totalCount: res ? (res.totalCount ?? res.items.length) : 0,
                pageNo: Number(url.searchParams.get("pageNo") ?? 1),
              },
            },
          };
    return new Response(JSON.stringify(envelope));
  };
  return {
    client: dataGoKr.create({
      baseURL: "https://apis.example/1230000/as/ScsbidInfoService",
      serviceKey: opts.serviceKey ?? "test-key",
      params: { type: "json" },
      retry: { retries: 0 },
      fetch: fetchFn,
    }),
    requests,
  };
}
