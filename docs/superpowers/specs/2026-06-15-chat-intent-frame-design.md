# Chat Intent Frame Design

## Goal

블로그 챗봇이 표현별 문자열 규칙에 의존하지 않고, 대화 맥락에서 사용자의 대상, 작업, 시간 조건, 요청 필드를 구조적으로 해석하도록 한다.

## Problem

현재 planner는 `route`, `directAction`, `retrievalScope`, `referenceTarget`을 한 번에 생성한다. 이 필드들은 서로 파생 가능한 값인데도 모델이 각각 판단하기 때문에 다음 문제가 발생한다.

- 최신 글 질문을 일반 corpus retrieval로 분류한다.
- 작성자 확인 뒤에도 동일한 명확화 질문을 반복한다.
- 검색어와 대상 범위가 충돌하면 관련 근거가 검색 결과에서 밀린다.
- 새로운 표현을 지원할 때 자연어 패턴 목록을 계속 추가하게 된다.

## Architecture

planner 출력의 중심을 `ChatIntentFrame`으로 변경한다.

```text
question + conversation context
  -> planner: ChatIntentFrame
  -> validator: normalized ChatIntentFrame
  -> adapter: existing ChatQuestionPlan
  -> current direct/retrieval executors
```

`ChatIntentFrame`은 사용자의 의미만 표현한다.

- `operation`: 답변, 요약, 설명, 추천, 비교, 대화 응답, 연락처 조회
- `target`: 현재 문서, 작성자 프로필, 챗봇, 이름 있는 개체
- `temporalConstraint`: 최신, 최초, 없음
- `requestedFields`: 제목, 게시일, 내용, 연락처
- `evidenceScope`: 현재 문서, 특정 개체, 전체 corpus, 없음
- `searchConcepts`: 반드시 보존할 핵심 개념과 보조 개념
- `missingSlots`: 답변 전에 반드시 확인해야 하는 정보
- `confidence`: 전체 해석 신뢰도

`route`와 `directAction`은 planner가 생성하지 않는다. validator와 adapter가 frame에서 결정한다.

## Validation Rules

- `missingSlots`가 있으면 `clarify`로 라우팅한다.
- `social_reply`, `contact`는 direct executor를 사용한다.
- 시간 조건이 `latest` 또는 `oldest`이고 요청 필드가 제목이나 게시일이면 chronological direct executor를 사용한다.
- 요약, 설명, 비교처럼 본문 근거가 필요한 작업은 시간 조건이 있어도 해당 글을 선택한 뒤 모델 답변을 사용한다.
- 작성자 대상은 `profile`로 정규화하며 assistant 대상과 구분한다.
- `required` search concept는 lexical/semantic 결과 병합 과정에서 최소 한 건의 근거를 보존한다.
- 모순된 scope는 target과 operation을 기준으로 정규화한다.

## Compatibility

기존 `ChatQuestionPlan`과 executor는 즉시 제거하지 않는다. `buildChatQuestionPlanFromIntentFrame` 어댑터가 기존 타입을 생성해 현재 retrieval, reranking, observability 코드를 그대로 사용한다.

기존 자연어 패턴 기반 보정은 planner의 모델 오류 또는 구형 결과를 위한 fallback으로만 남기고, 정상 경로에서는 사용하지 않는다.

## Error Handling

- 모델 호출 실패와 스키마 파싱 실패는 기존 `model_error` 응답을 유지한다.
- 낮은 confidence만으로 명확화를 강제하지 않는다. 답변에 필수인 slot이 실제로 누락된 경우에만 명확화한다.
- validator는 예외를 던지지 않고 유효한 frame으로 정규화한다.

## Testing

- schema 테스트로 frame 계약을 고정한다.
- validator 테스트로 최신 글, 게시일, 작성자, 현재 글, 명확화 사례를 검증한다.
- adapter 테스트로 기존 plan과 routing 호환성을 검증한다.
- planner 테스트는 구조화된 frame 출력이 문자열 패턴 없이 올바른 plan으로 변환되는지 검증한다.
- 기존 chat 테스트 전체와 lint를 실행해 회귀를 확인한다.
