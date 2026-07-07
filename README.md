<!-- mcp-name: io.github.opendata-kr/narajangteo-opening -->

# narajangteo-opening-mcp

[![npm version](https://img.shields.io/npm/v/@opendata-kr/narajangteo-opening-mcp.svg)](https://www.npmjs.com/package/@opendata-kr/narajangteo-opening-mcp)
[![license](https://img.shields.io/npm/l/@opendata-kr/narajangteo-opening-mcp.svg)](./LICENSE)

조달청 나라장터 **낙찰정보서비스**(ScsbidInfoService) Open API를 감싼 로컬 MCP 서버. 개찰결과(최종낙찰자·투찰업체별 순위·예비가격·유찰/재입찰)를 조회한다.

> [!NOTE]
> 이 README는 스캐폴딩 골격이다. 전체 클라이언트별 설정 매트릭스, 원클릭 설치 버튼, 인증키 발급 그림 가이드(`docs/service-key-guide.md`)는 발행 전 채운다.

## 무엇을 조회하나 (예시 프롬프트)

- "R25BK00965123 공고 개찰결과 보여줘. 낙찰자랑 투찰업체별 순위·금액."
- "인천 지역 물품 낙찰 결과 최근 것 검색해줘."
- "이 공고 유찰됐는지 확인해줘."

## Prerequisites

- Node.js 24+ (`.nvmrc` = `lts/krypton`)
- data.go.kr(공공데이터포털) **낙찰정보서비스** 활용신청 후 발급받은 **Decoding(원본) 인증키**. 발급 절차는 [`docs/service-key-guide.md`](./docs/service-key-guide.md) 참조.

## Configuration

MCP 클라이언트 설정에 아래 블록을 추가한다. `@latest`로 핀한다.

```json
{
  "mcpServers": {
    "narajangteo-opening": {
      "command": "npx",
      "args": ["-y", "@opendata-kr/narajangteo-opening-mcp@latest"],
      "env": {
        "DATA_GO_KR_SERVICE_KEY": "여기에_Decoding_인증키"
      }
    }
  }
}
```

> [!IMPORTANT]
> `DATA_GO_KR_SERVICE_KEY`는 필수 시크릿이다. 원클릭·env 미지원 클라이언트는 설치 후 셸 환경변수로 키를 설정한다.

## 환경변수

| 이름 | 필수 | 비밀 | 기본값 | 설명 |
|---|---|---|---|---|
| `DATA_GO_KR_SERVICE_KEY` | 예 | 예 | | 공공데이터포털 Decoding(원본) 인증키 |
| `DATA_GO_KR_BASE_URL` | 아니오 | 아니오 | `https://apis.data.go.kr` | 게이트웨이 base URL 오버라이드 |

## Tools

조회 전용 도구 3종(`readOnlyHint`). 업무구분(`bidKind`) 미지정 시 물품/공사/용역/외자를 병렬 조회한다. 기간(`startDate`/`endDate`, YYYYMMDD)은 함께 지정하며 넓은 범위는 내부에서 월 단위로 분할한다.

| 도구 | 용도 | 주요 입력 | 반환 | 한계 |
|---|---|---|---|---|
| `search_awards` | 낙찰 결과·경쟁사·종단 조회 | `keyword`·`institution`·`demandInstitutionCode`·`region`·`industry`·`minPrice`/`maxPrice`·`bizno`·기간 | 업무구분별 `{ totalCount, items: 낙찰자[] }` | 낙찰자만(진 입찰 미포함). 사정률 예측·투찰가 산출은 비목표 |
| `search_openings` | 개찰 진행·유찰/재입찰 발굴 | 위와 유사 + `status`(개찰완료/유찰/재입찰) | 업무구분별 `{ totalCountBeforeFilter, filteredCount, items: 개찰요약[] }` | `status`는 클라이언트 필터라 느림(좁혀 쓰기, `truncated`면 미완). 재입찰≠재공고 |
| `get_bid_result` | 단일 공고 심층·딜 사후분석 | `bidNtceNo`(필수)·`bidKind`·`status`·`bidNtceOrd`/`bidClsfcNo`/`rbidNo`·`myBizno` | `{ executions: [{ award, opening, preparPrice, bidders, awardMethod }] }` | 낙찰방식 추정(협상계약만 점수, 적격심사는 금액·순위) |

### search_awards
- 입력: `bidKind[]?`, `keyword?`, `institution?`, `demandInstitution?`, `demandInstitutionCode?`, `detailProductCode?`, `region?`, `industry?`, `minPrice?`/`maxPrice?`, `bizno?`, `startDate?`/`endDate?`, `dateType?`(posted|opened), `pageSize?`(≤100), `maxPages?`.
- 반환 필드: `bidNtceNo`, `bidNtceNm`, `winner`, `winnerBizno`, `awardAmount`, `awardRate`(예정가 대비 %), `realOpeningDt`, `demandInstitution`, `finalAwardDate`, `participants`.

### search_openings
- 입력: search_awards와 유사 + `status?`. 개찰결과는 응답이 느려 `pageSize` 기본 20·`maxPages` 기본 5.
- 반환 필드: `progress`(개찰완료/유찰/재입찰), `openingDt`, `participants`, `topBidder`(1위 업체·투찰금액·투찰율), `reservePriceFileExists`, 유찰 시 `failReasonHint`(참가업체수 기반 추정).

### get_bid_result
- 입력: `bidNtceNo`(필수), `bidKind?`, `status?`(completed|failing|rebid|all), `bidNtceOrd?`/`bidClsfcNo?`/`rbidNo?`(집행 좁힘), `myBizno?`(자사 투찰행 `isOurs` 표시).
- 반환: `executions[]`(집행별) 각각 `award`(낙찰자), `opening`(개찰진행), `preparPrice`(예정가격·기초금액·사정률·복수예가), `bidders[]`(순위·투찰금액·투찰율·평가점수), `awardMethod`(추정). 파트별 실패는 해당 파트 `error`로 표면화.

## 개발

```bash
nvm use
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

## License

MIT. [`LICENSE`](./LICENSE) 참조.
