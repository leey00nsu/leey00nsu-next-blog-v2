# Stateful Conversational RAG Design

## Goal

블로그 챗봇을 메시지 이력을 매번 재해석하는 구조에서 구조화된 대화 상태를 이어가는 Stateful Conversational RAG 구조로 전환한다. 자연어 표현별 보정 규칙을 제거하고, planner가 해석한 의미가 검색, 실행, 캐시, 응답까지 손실 없이 전달되도록 한다.

## Problems to Solve

현재 `ChatIntentFrame`은 planner 출력을 구조화하지만 기존 `ChatQuestionPlan` 호환 계층으로 변환되는 과정에서 일부 의미가 사라진다.

- `requestedFields`가 유실되어 응답 단계에서 날짜 관련 문자열 패턴을 다시 검사한다.
- 필수 검색 개념과 보조 검색 개념이 `additionalKeywords`로 합쳐진다.
- localStorage에는 메시지가 저장되지만 서버는 최근 대화만 받아 매번 대상을 다시 추론한다.
- 명확화 질문이 일반 메시지로만 남아 후속 답변에서 중단된 작업을 명시적으로 재개할 수 없다.
- 캐시 키가 실행 의미 전체를 반영하지 않아 다른 문맥의 질문이 충돌할 수 있다.
- 새 Intent 경로와 legacy 문자열 보정 경로가 함께 존재한다.

## Architecture

클라이언트는 메시지와 함께 최신 `ChatConversationState`를 assistant message metadata에 저장한다. 서버는 상태를 영속화하지 않으며, 요청마다 전달받은 상태를 검증하고 현재 질문으로 생성한 `ChatIntentPatch`를 reducer에 적용한다.

```text
localStorage
  -> messages + ChatConversationState
  -> request
  -> validate conversation state
  -> planner creates ChatIntentPatch
  -> reducer creates NormalizedChatIntent and next state
  -> executor selects deterministic or retrieval execution
  -> grounded response + next state
  -> assistant metadata
  -> localStorage
```

`ChatQuestionPlan`, `route`, `directAction`, `retrievalScope`, `additionalKeywords`는 제거한다. 검색과 executor는 `NormalizedChatIntent`를 직접 받는다.

## State Model

```ts
interface ChatConversationState {
  version: 1
  resolvedTarget: ChatTarget | null
  activeOperation: ChatOperation
  temporalConstraint: ChatTemporalConstraint
  requestedFields: ChatRequestedField[]
  requiredConcepts: string[]
  optionalConcepts: string[]
  evidenceScope: ChatEvidenceScope
  pendingClarification: ChatPendingClarification | null
  lastResolvedQuestion: string | null
}

interface ChatIntentPatch {
  standaloneQuestion: string
  targetUpdate: ChatTargetUpdate
  operation: ChatOperation
  temporalConstraint: ChatTemporalConstraint
  requestedFields: ChatRequestedField[]
  requiredConcepts: string[]
  optionalConcepts: string[]
  evidenceScope: ChatEvidenceScope
  missingSlots: ChatMissingSlot[]
  clarificationQuestion: string | null
  confidence: ChatConfidence
}

type ChatTargetUpdate =
  | { kind: 'preserve' }
  | { kind: 'replace'; target: ChatTarget }
  | { kind: 'clear' }
```

`ChatIntentPatch`는 현재 발화가 기존 상태를 어떻게 변경하는지만 표현한다. reducer는 기존 상태와 patch를 결합하고 도메인 불변식을 검증해 `NormalizedChatIntent`와 다음 `ChatConversationState`를 함께 반환한다.

## Conversation Semantics

- `preserve`는 기존 대상을 유지한다.
- `replace`는 사용자가 새 대상을 지정하거나 이전 대상을 정정했을 때 사용한다.
- `clear`는 새 대화를 시작하거나 사용자가 이전 문맥을 명시적으로 취소했을 때 사용한다.
- planner 신뢰도가 낮다는 이유만으로 명확화를 생성하지 않는다.
- 답변에 필수인 slot이 실제로 없을 때만 `pendingClarification`을 만든다.
- `pendingClarification`은 누락된 slot과 중단된 Intent를 보존한다.
- 후속 답변이 slot을 채우면 reducer는 중단된 Intent를 즉시 재개하고 동일 내용을 다시 확인하지 않는다.
- 새로운 독립 질문은 이전 operation과 검색 개념을 보존하지 않는다. 대상 유지 여부는 `targetUpdate`로 명시한다.

## Client Persistence and Trust Boundary

`lee-chat-sdk`의 `persistence: 'localStorage'`를 유지한다. 최신 상태는 assistant response metadata의 `conversationState`에 포함하고 다음 요청에서 그대로 전달한다.

서버는 다음 조건을 모두 만족할 때만 클라이언트 상태를 사용한다.

- Zod schema 검증에 성공한다.
- 지원하는 `version`과 일치한다.
- 배열 길이와 문자열 길이 제한을 통과한다.
- 대상과 evidence scope 조합이 도메인 불변식을 만족한다.

검증에 실패한 상태는 오류로 응답하지 않고 빈 상태로 대체한다. 클라이언트 상태는 검색과 문맥 해석을 위한 힌트로만 사용하며, 답변의 사실성은 검색 근거와 citation 검증으로 보장한다.

## Execution Model

executor 선택은 `NormalizedChatIntent`의 구조를 기준으로 결정한다.

```text
missingSlots exists                    -> clarification executor
operation is social_reply              -> social executor
operation is contact                   -> contact executor
temporal order is latest or oldest     -> chronological selector
otherwise                              -> evidence retrieval
```

chronological selector가 문서를 선택한 뒤 실행은 operation에 따라 달라진다.

- `answer`이고 요청 필드가 제목이나 게시일이면 결정론적 응답을 만든다.
- `summarize`, `explain`, `compare`는 선택한 문서를 근거로 답변 모델을 호출한다.
- 날짜 포함 여부는 질문 문자열이 아니라 `requestedFields`로 결정한다.
- executor가 처리할 수 없는 operation과 field 조합은 조용히 일반 답변으로 바꾸지 않고 명시적인 검증 실패로 처리한다.

## Retrieval Contract

검색은 필수 조건과 순위 계산을 분리한다.

1. 대상, evidence scope, 현재 문서 slug로 검색 corpus를 제한한다.
2. `requiredConcepts`를 alias 정규화한 뒤 필수 근거 조건으로 적용한다.
3. lexical 검색과 semantic 검색을 각각 실행한다.
4. `optionalConcepts`, source category, 제목, 본문, 태그 일치를 순위에 반영한다.
5. 필수 조건을 만족한 결과에만 reranking과 `TOP_K` 제한을 적용한다.
6. 필수 개념을 충족하는 근거가 없으면 답변 모델을 호출하지 않고 `insufficient_search_match`를 반환한다.

검색 단계는 사실의 긍정과 부정을 판단하지 않는다. 예를 들어 Vercel이라는 개념이 포함된 근거를 찾는 것까지만 담당하고, 사용 여부는 답변 모델이 근거 문맥에서 판단한다.

## Cache Model

캐시 키는 정규화된 실행 의미와 근거 데이터 버전으로 만든다.

```text
locale
+ target
+ operation
+ temporalConstraint
+ requestedFields
+ requiredConcepts
+ evidenceScope
+ currentPostSlug
+ evidenceVersion
```

문장 표현과 대화 상태 전체는 캐시 키에 포함하지 않는다. 같은 의미의 질문은 캐시를 공유하고, 같은 문장이라도 대상이나 요청 필드가 다르면 별도 캐시를 사용한다. 명확화, 검색 부족, 근거 부족, 모델 오류 응답은 캐시하지 않는다.

## Planner Failure Recovery

1. planner에 현재 질문, 검증된 상태, 필요한 최소 대화 이력을 전달한다.
2. 구조화 출력이 실패하면 동일 schema로 한 번 재시도한다.
3. 재시도도 실패하면 이전 상태와 결정론적 규칙만으로 실행 가능한지 확인한다.
4. 실행 가능하면 모델 planner 없이 처리한다.
5. 필수 의미를 결정할 수 없으면 `model_error`를 반환한다.

예외를 모두 같은 catch 블록에서 숨기지 않고 `invalid_state`, `invalid_intent_patch`, `planner_unavailable`, `unsupported_intent`를 내부 관측 사유로 구분한다. 공개 응답은 기존 안전한 오류 계약을 유지한다.

## Migration

새 구조는 호환 adapter를 확장하지 않고 별도 feature flag 아래에서 완성한다.

1. 상태 schema, patch schema, reducer를 추가한다.
2. 새 executor와 retrieval 계약을 구현한다.
3. API와 SDK metadata를 새 상태 계약에 연결한다.
4. 기존과 새 경로에 동일한 평가 fixture를 실행해 결과를 비교한다.
5. 새 경로를 기본값으로 전환한다.
6. `ChatQuestionPlan`, adapter, legacy 긍정 표현 목록, 시간 표현 패턴, 관련 테스트를 제거한다.
7. feature flag와 구형 분기를 제거한다.

하나의 요청이 기존 경로와 새 경로를 동시에 실행하지 않으며, shadow 실행으로 사용자 질문이나 대화 내용을 중복 전송하지 않는다.

## Testing

### Schema and Reducer

- 정상 상태와 변조·구버전 상태 검증
- 대상 preserve, replace, clear
- 새 독립 질문에서 오래된 operation과 개념 제거
- 명확화 생성과 중단된 Intent 재개
- 사용자 정정 우선 적용

### Executors

- 최신 글 제목 직접 응답
- 최신 글 제목과 게시일 직접 응답
- 최신 글 요약 모델 호출
- 연락처 직접 응답
- 현재 문서 기반 답변
- 지원하지 않는 operation과 field 조합 거부

### Retrieval

- 필수 개념 누락 시 검색 실패
- optional 개념은 순위에만 영향
- lexical과 semantic 병합 후 필수 조건 유지
- alias 정규화
- 필수 근거가 `TOP_K` 적용 전에 제거되지 않음

### Integration

- `이 사람 Vercel 써봤어? -> 블로그 주인`에서 즉시 답변
- `이 사람이 이윤수야? -> 그래`에서 확정 상태 유지
- `마지막 글 언제야?`에서 제목과 게시일 응답
- 새 대화에서 이전 대상 초기화
- 조작된 localStorage 상태 무시
- 같은 문장과 다른 Intent의 캐시 분리

## Success Criteria

- 지원 문장을 늘리기 위해 긍정 표현, 최신 글 표현, 날짜 표현 목록을 수정하지 않는다.
- `requestedFields`, 필수 검색 개념, 대상, 시간 조건이 planner부터 executor까지 손실 없이 유지된다.
- 명확화에 답한 뒤 같은 대상을 다시 확인하지 않는다.
- 모든 답변은 검증된 직접 데이터 또는 citation이 있는 검색 근거에 기반한다.
- legacy `ChatQuestionPlan` 경로와 문자열 보정 코드가 제거된다.
- 기존 chat 테스트, 새 상태 시나리오 테스트, TypeScript 검사와 lint가 통과한다.
