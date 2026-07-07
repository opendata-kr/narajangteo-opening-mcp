import { createClient, type DataGoKrClient } from "@opendata-kr/core";

// 나라장터 낙찰정보서비스(ScsbidInfoService). 입찰공고(/ad/)와 달리 /as/ 경로다.
const SERVICE_PATH = "/1230000/as/ScsbidInfoService";

export function createGateway(): DataGoKrClient {
  return createClient({ path: SERVICE_PATH, params: { type: "json" } });
}
