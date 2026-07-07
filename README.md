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

구현 예정(설계 확정, 구현 계획 진행 중). 자세한 파라미터·응답 필드는 발행 전 문서화한다.

- `search_awards`: 낙찰된 목록 현황 검색(공고명·기관·지역·업종·추정가·사업자번호·기간).
- `search_openings`: 개찰결과 목록 검색(진행상태 유찰/재입찰 필터).
- `get_bid_result`: 공고번호로 낙찰자·개찰진행·예비가격상세·투찰업체별을 복합키 정합으로 단건 조회.

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
