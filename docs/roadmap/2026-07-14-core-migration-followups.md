# core 0.4 이행 후속

- **라이브 재검증 1회**: 이행 후 실 API 구동 기록이 없다. 승인 키로 전 도구를 구동해 스키마와 실응답 정합을 확인하고 `invalid > 0`이면 실패로 승격한다. 결과는 `.superpowers/sdd/probe-findings.md`에 기록.
- **테스트 캐스트 정리**: `src/format.test.ts`의 `as any` 2건(부분 BidderDetail 픽스처)을 `Partial<BidderDetail>` 또는 팩토리로 대체.
