import dataGoKr, { type DataGoKrClient } from "@opendata-kr/core";

// 나라장터 낙찰정보서비스(ScsbidInfoService). 입찰공고(/ad/)와 달리 /as/ 경로다.
const BASE_URL = "https://apis.data.go.kr/1230000/as/ScsbidInfoService";

export function createGateway(): DataGoKrClient {
  // 개찰결과(계열 B)는 응답이 무겁고 느려 기본 타임아웃(~10초)을 넘는 페이지가 있다
  // (라이브: 30~50행에서 8~9초, 100행 타임아웃). 낙찰(계열 A)은 빨라 영향 없다.
  // 오버라이드(DATA_GO_KR_BASE_URL)는 서비스 경로를 포함한 전체 URL이어야 한다 (core 0.4 규약).
  return dataGoKr.create({
    baseURL: process.env.DATA_GO_KR_BASE_URL ?? BASE_URL,
    params: { type: "json" },
    timeout: 30000,
  });
}
