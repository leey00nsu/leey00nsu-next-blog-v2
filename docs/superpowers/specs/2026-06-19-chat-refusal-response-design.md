# Chat Refusal Response Design

## Problem

근거가 없는 질문은 애플리케이션에서 `insufficient_search_match` 또는
`insufficient_evidence`로 정상 분류되지만 `answer`가 빈 문자열이다. Lee Chat
응답 변환기는 빈 텍스트를 허용하지 않아 정상적인 refusal이 HTTP 500과 일반
오류 문구로 바뀐다.

## Decision

모든 refusal 응답은 다음 계약을 만족한다.

- `answer`는 locale에 맞는 비어 있지 않은 사용자 메시지다.
- `grounded`는 `false`다.
- `citations`는 빈 배열이다.
- `refusalReason`은 기존 값을 유지한다.

근거 부족 응답은 다음 문구를 사용한다.

- ko: `공개된 정보에서는 확인할 수 없어요.`
- en: `I couldn't verify that from the public information.`

사용량 제한, 입력 길이, API 설정, 모델 오류도 각 사유에 맞는 비어 있지 않은
문구를 반환한다. 따라서 일반 JSON API와 Lee Chat이 같은 응답을 표시하며,
라우트 어댑터에 별도 보정 로직을 두지 않는다.

## Architecture

`features/chat/lib/build-chat-refusal-response.ts`가 locale과 refusal reason을 받아
`BlogChatResponse`를 생성하는 유일한 함수가 된다. Workflow와 application
entry point의 중복 `buildRefusalResponse`를 이 함수로 교체한다.

`BlogChatResponseSchema`는 `answer`에 `.min(1)`을 적용해 빈 답변이 다시 public
response로 나가는 것을 차단한다. 생성 모델의 draft는 거절 시 빈 답변을 쓸 수
있으므로 `BlogChatModelDraftSchema`는 변경하지 않는다.

## Error Handling

- 검색 결과 없음과 모델이 판단한 근거 부족은 공개 정보에서 확인 불가로 표현한다.
- citation 검증 실패와 모델/API 오류는 답변 준비 실패로 표현한다.
- rate/daily/input 제한은 제한 원인을 사용자에게 직접 알린다.
- `refusalReason`은 캐시 제외와 observability 분석을 위해 보존한다.

## Testing

1. 각 refusal reason이 locale별 비어 있지 않은 답변을 만드는 단위 테스트.
2. `BlogChatResponseSchema`가 빈 `answer`를 거부하는 테스트.
3. `이윤수의 나이`와 같은 근거 없음 workflow가
   `insufficient_search_match`와 공개 정보 확인 불가 문구를 반환하는 테스트.
4. Lee Chat route가 해당 refusal을 HTTP 200 텍스트 응답으로 변환하는 회귀 테스트.
5. 전체 TypeScript, ESLint, Vitest와 실제 로컬 질의 검증.
