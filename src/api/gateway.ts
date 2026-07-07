import { createClient, type DataGoKrClient } from "@opendata-kr/core";

// 나라장터 낙찰정보서비스(ScsbidInfoService). 입찰공고(/ad/)와 달리 /as/ 경로다.
const SERVICE_PATH = "/1230000/as/ScsbidInfoService";

export function createGateway(): DataGoKrClient {
  // 개찰결과(계열 B)는 응답이 무겁고 느려 기본 타임아웃(~10초)을 넘는 페이지가 있다
  // (라이브: 30~50행에서 8~9초, 100행 타임아웃). 낙찰(계열 A)은 빨라 영향 없다.
  return createClient({ path: SERVICE_PATH, params: { type: "json" }, timeout: 30000 });
}
