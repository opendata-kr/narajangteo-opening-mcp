# Changelog

## [0.2.0](https://github.com/opendata-kr/narajangteo-opening-mcp/compare/v0.1.0...v0.2.0) (2026-07-07)


### Features

* **api:** 낙찰정보 오퍼레이션명·inqryDiv 매핑 endpoints 추가 ([d8883f4](https://github.com/opendata-kr/narajangteo-opening-mcp/commit/d8883f43ed2016e7e24ee2e871c66c7ff13d37ea))
* **api:** 조회기간 자동분할·페이지 소진 dateWindow 추가 ([eb3738c](https://github.com/opendata-kr/narajangteo-opening-mcp/commit/eb3738caa6c04c39034bb1498ce1ed69bf262ded))
* **format:** A/B/D 도메인 포맷터 및 opengCorpInfo·복합키 파서 추가 ([5ed25af](https://github.com/opendata-kr/narajangteo-opening-mcp/commit/5ed25afac6aa7ebc47c4c7d9d17484628d4b422e))
* **format:** 예비가격 집약·사정률·유찰 사유 힌트·낙찰방식 추정 추가 ([dc16b07](https://github.com/opendata-kr/narajangteo-opening-mcp/commit/dc16b0779e5ecca07c19d5f5f2a96954896f108d))
* **server:** search_awards·search_openings·get_bid_result 3툴 등록 ([0187119](https://github.com/opendata-kr/narajangteo-opening-mcp/commit/018711999a89555c9e967a87304d9604b40588b0))
* **server:** 레지스트리 아이콘 추가 ([85837fc](https://github.com/opendata-kr/narajangteo-opening-mcp/commit/85837fc55bd98839c7e9500d228262a85cd82b66))
* **tools:** get_bid_result 단건 조회 툴 추가(A+B+C+D 복합키 조인) ([a8a87c4](https://github.com/opendata-kr/narajangteo-opening-mcp/commit/a8a87c45c9b98b94b2c731409a1670374c4529b5))
* **tools:** get_bid_result에 집행 좁히기(ord/clsfc/rbid)·myBizno isOurs 태깅 추가(설계 §5.3) ([e06bc74](https://github.com/opendata-kr/narajangteo-opening-mcp/commit/e06bc7409962cfc02521d865bf0ce2b625637124))
* **tools:** search_awards 낙찰 검색 툴 추가(기간창 분할·부분실패 표면화) ([5dddeaa](https://github.com/opendata-kr/narajangteo-opening-mcp/commit/5dddeaa553522e75c953764a86a7bfeb2fa4a1f1))
* **tools:** search_openings 개찰 검색 툴 추가(유찰 사유 힌트·필터 건수 구분) ([1a04257](https://github.com/opendata-kr/narajangteo-opening-mcp/commit/1a042579dc2017a1c7416f8def3b252ed8b8d166))


### Bug Fixes

* **api:** inqryDiv 조회구분을 명세대로 교정(기본판 공고=2·개찰=3, PPSSrch 공고게시=1) ([5b9a253](https://github.com/opendata-kr/narajangteo-opening-mcp/commit/5b9a2535f95dd46aca3712011aa88564f4cd1bfc))
* **api:** 라이브 검증 반영(개찰 타임아웃 30초·기간창 31일·개찰 페이지 축소) ([773b995](https://github.com/opendata-kr/narajangteo-opening-mcp/commit/773b9953b90bbf1bebeacab4b9a6776caec1b118))
* **tools:** search_awards 기간 파라미터 한쪽만/역전 시 명시적 에러(조용한 누락 방지) ([8b93417](https://github.com/opendata-kr/narajangteo-opening-mcp/commit/8b9341740fbb6eccee57559ca45158e7c5c44d25))


### Documentation

* **readme:** 3툴 파라미터·반환·한계 문서화 ([6052f00](https://github.com/opendata-kr/narajangteo-opening-mcp/commit/6052f0092f573881231ac858fe11531ab4ee4638))
* **readme:** 원형 A 전체(클라이언트 매트릭스 26종·원클릭 버튼·3툴 파라미터·응답 필드) ([303031f](https://github.com/opendata-kr/narajangteo-opening-mcp/commit/303031f10ce3c0f582975b99df4b67e669109406))
* **service-key-guide:** 레퍼런스(bid·prespec) 구조로 재작성 ([222f0b8](https://github.com/opendata-kr/narajangteo-opening-mcp/commit/222f0b837b4aefafd72f44a9eeed72ddbac3b1ea))
* **service-key-guide:** 인증키 발급 그림 가이드 4컷 + 마스킹 스크린샷 ([1e56304](https://github.com/opendata-kr/narajangteo-opening-mcp/commit/1e56304b32f42947b78d1372fe6c7caf55c77129))
* **tools:** 도구 설명 표준 반영(title·readOnly/openWorld 애노테이션·형제 구분·파라미터 describe) ([bb764ea](https://github.com/opendata-kr/narajangteo-opening-mcp/commit/bb764ea0715e23a28c02033e6d69651fbe15afa5))


### Refactor

* **api:** 미사용 BID_KIND_LABEL export 제거 ([e37381e](https://github.com/opendata-kr/narajangteo-opening-mcp/commit/e37381ea82de3bb48ab34a4b3d62109ffe990734))
* 최종 리뷰 Minor 정리 ([32c29bd](https://github.com/opendata-kr/narajangteo-opening-mcp/commit/32c29bd638fc081ded9cb0b75b8697aa247911c7))

## Changelog

이 프로젝트의 주요 변경 사항을 기록한다. 형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르고, 버전은 [Semantic Versioning](https://semver.org/lang/ko/)을 따른다.

첫 릴리스부터 release-please가 conventional commits에서 이 파일을 생성·관리한다.
