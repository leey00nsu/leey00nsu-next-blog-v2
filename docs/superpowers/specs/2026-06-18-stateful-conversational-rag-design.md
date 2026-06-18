# Stateful Conversational RAG Recovery Design

## Goal

현재 배포 서버에서 정상 동작하는 질문 품질을 보존하면서, 브라우저가 최소 대화 상태를 유지하는 Stateful Conversational RAG로 전환한다. 질문 의미는 planner가 해석하고, 콘텐츠에서 생성한 entity catalog가 planner를 grounding하며, reducer와 invariant validator가 잘못된 상태 전이와 실행 불가능한 Intent를 차단한다.

이 설계는 워크트리에서 확인된 다음 회귀를 복구한다.

- 명시된 `lee-spec-kit`, `Leemage`를 planner가 target으로 선택하지 못했다.
- 여러 프로젝트를 묻는 질문을 `corpus`가 아니라 명확화로 보냈다.
- `operation: answer`와 `evidenceScope: none` 같은 실행 불가능한 조합이 schema를 통과했다.
- 새로운 독립 질문이 이전 `pendingClarification`을 잘못 재개했다.
- mock 기반 테스트와 retrieval 지표는 통과했지만 실제 planner 응답 품질은 검증하지 않았다.

## Success Baseline

현재 배포 서버에서 정상 답변하는 golden 질문은 회귀 없이 유지해야 한다.

- `lee-spec-kit을 왜 만들었어?`
- `Leemage에서 Presigned URL을 사용한 이유가 뭐야?`
- `최근 프로젝트에서 AI를 어떻게 활용하고 있어?`
- `이 사람 Vercel 써봤어?` → `블로그 주인`
- `마지막 글 언제야?`

상태 기능은 이 기준선 위에 추가한다. 구조적 테스트 통과만으로 완료로 판단하지 않고, 실제 `.env`의 planner 모델로 golden 질문과 대화 시나리오를 평가한다.

## Architecture

```text
question + validated conversation state + current page
  -> build dynamic entity catalog candidates
  -> planner interprets meaning and selects candidates
  -> normalizer resolves canonical target and intent
  -> reducer applies explicit context action
  -> invariant validator rejects impossible combinations
  -> scoped lexical + semantic retrieval
  -> citation-grounded answer
  -> minimal next conversation state in SDK metadata
```

책임은 다음처럼 분리한다.

- Entity catalog: 콘텐츠의 title, slug, alias, tag, search term으로 canonical 후보를 만든다.
- Planner: operation, 대화 연결, 문맥 전환, 후보 선택, 시간 조건, 요청 필드와 검색 개념을 해석한다.
- Normalizer: planner가 선택한 후보 ID를 canonical target으로 변환한다.
- Reducer: 검증된 이전 상태와 현재 Intent의 상태 전이를 계산한다.
- Invariant validator: target, operation, evidence scope, clarification 조합을 실행 전에 검증한다.
- Retrieval: 검증된 scope 안에서 근거를 찾고 citation 가능한 근거만 답변 단계에 전달한다.

phrase 목록이나 프로젝트 고유명사 하드코딩으로 planner 의미를 대신 판단하지 않는다.

## Dynamic Entity Catalog

catalog는 빌드된 post, project, profile, assistant curated source에서 동적으로 생성한다.

```ts
interface ChatEntityCandidate {
  entityId: string
  kind: 'post' | 'project' | 'profile' | 'assistant'
  slug: string
  title: string
  aliases: string[]
  searchTerms: string[]
  sourceCategory: string
}
```

질문은 정규화한 뒤 title, slug, alias와 매칭한다. 매칭된 후보 목록만 planner 입력에 전달하고 planner는 자유 형식 target을 생성하지 않는다. 후보가 없더라도 대명사나 현재 글 참조가 아니라면 즉시 명확화를 요구하지 않고 corpus 검색이 가능한 질문인지 planner가 판단한다.

catalog는 고유명사의 canonical identity를 제공하지만 질문의 의미, operation, scope를 대신 결정하지 않는다.

## Planner Contract

planner 입력은 다음으로 제한한다.

- 현재 질문
- 검증된 `ChatConversationState`
- 최근 대화 1~2턴
- 현재 페이지 slug와 종류
- 현재 질문에서 찾은 entity 후보 목록

planner 출력은 상태 전이와 실행 의미를 함께 표현한다.

```ts
type ChatContextAction =
  | 'continue'
  | 'reset'
  | 'resolve_clarification'

type ChatTargetSelection =
  | { kind: 'candidate'; entityId: string }
  | { kind: 'preserve' }
  | { kind: 'none' }

interface ChatIntentPlan {
  standaloneQuestion: string
  contextAction: ChatContextAction
  targetSelection: ChatTargetSelection
  operation: ChatOperation
  temporalConstraint: ChatTemporalConstraint
  requestedFields: ChatRequestedField[]
  requiredConcepts: string[]
  optionalConcepts: string[]
  evidenceScope: ChatEvidenceScope
  missingSlots: ChatMissingSlot[]
  clarificationQuestion: string | null
  confidence: ChatConfidence
  reason: string
}
```

`contextAction`과 `targetSelection`은 독립된 축이다. 따라서 새 주제이면서 새 대상이 명시된 질문은 `reset + candidate`로 표현할 수 있다. 이는 기존 `targetUpdate: clear | replace | preserve` 계약의 모순을 제거한다.

## Conversation State and Transitions

브라우저 localStorage에는 다음 대화에 필요한 최소 상태만 저장한다.

```ts
interface ChatConversationState {
  version: 2
  focusedTarget: ChatTarget | null
  lastIntent: NormalizedChatIntent | null
  pendingClarification: PendingClarification | null
}
```

상태 전이 규칙은 다음과 같다.

- `continue`: 기존 target과 문맥을 사용하는 후속 질문이다.
- `reset`: 기존 target과 pending clarification을 버리고 새 질문을 시작한다.
- `resolve_clarification`: 사용자가 직전 명확화의 누락 slot에 답한 경우에만 중단된 Intent를 재개한다.
- 새 질문에 target이 포함됐다는 이유만으로 이전 pending Intent를 재개하지 않는다.
- planner 실패나 invariant 실패 시 잘못된 새 상태를 저장하지 않고 이전 검증 상태를 유지한다.
- 서버는 클라이언트 상태를 Zod와 도메인 invariant로 검증하며, 실패하면 빈 version 2 상태를 사용한다.

예상 전이는 다음과 같다.

```text
“이 사람 Vercel 써봤어?”
-> target 누락으로 pending clarification 저장

“블로그 주인”
-> resolve_clarification + owner candidate
-> 중단된 Vercel 질문 재개

“Leemage에서 Presigned URL을 쓴 이유는?”
-> reset + Leemage candidate
-> 이전 Vercel Intent와 clarification 폐기
```

## Normalization and Invariants

normalizer는 `candidate.entityId`를 catalog의 canonical target으로 변환한다. 그 뒤 validator가 다음 invariant를 적용한다.

- 근거가 필요한 operation에 target이 있으면 `evidenceScope`는 `entity`여야 한다.
- 현재 글 참조에 현재 slug가 있으면 scope는 `current_source`여야 한다.
- 여러 문서나 프로젝트를 종합하는 질문은 scope가 `corpus`여야 한다.
- target이 없고 일반 corpus 검색이 가능한 질문은 `corpus`를 사용할 수 있다.
- target이 없고 대명사 또는 현재 글 참조만 있으면 실제 누락 slot을 명확화한다.
- 근거가 필요한 operation은 `evidenceScope: none`을 가질 수 없다.
- `missingSlots`가 비어 있으면 clarification을 생성할 수 없다.
- `resolve_clarification`은 기존 `pendingClarification`이 있고 현재 답변이 누락 slot을 채울 때만 허용한다.
- `reset`은 이전 `pendingClarification`을 반드시 폐기한다.
- candidate ID가 catalog에 없으면 planner 출력을 실행하지 않는다.

일반 규칙으로 교정 가능한 scope 조합은 canonical 값으로 정규화한다. canonical target 유실, 존재하지 않는 candidate, 잘못된 clarification 재개처럼 의미가 달라질 수 있는 오류는 교정하지 않고 검증 실패로 처리한다.

## Retrieval and Answering

검증된 Intent를 다음 순서로 실행한다.

1. evidence scope, canonical target, current page로 corpus 범위를 제한한다.
2. lexical 검색과 semantic 검색을 병렬 실행한다.
3. required concepts를 만족하지 못하는 근거를 제거한다.
4. optional concepts, target 일치, source category로 순위를 계산한다.
5. 후보를 rerank한다.
6. citation 가능한 근거만 답변 모델에 전달한다.

알 수 없는 고유명사는 바로 명확화를 요구하지 않고 corpus에서 먼저 검색한다. 결과가 없으면 `insufficient_search_match`로 종료한다. 검색은 사실의 긍정과 부정을 판단하지 않으며, 답변 모델은 전달된 근거 안에서만 결론을 만든다. citation 검증을 통과하지 못한 모델 답변은 사용자에게 전달하지 않는다.

## Planner Failure and Error Handling

- schema 파싱 오류: 검증 오류를 포함해 동일 schema로 한 번 재시도한다.
- 의미 invariant 오류: 의미를 바꾸지 않는 일반 scope 규칙만 정규화한다.
- candidate 또는 상태 전이 오류: 실행하지 않고 안전한 오류를 반환한다.
- planner 실패: 이전 상태를 변경하지 않는다.
- 근거 부족: 답변 모델을 호출하지 않고 기존 안전한 검색 부족 응답을 반환한다.

내부 관측 사유는 `invalid_state`, `invalid_intent_plan`, `invalid_candidate`, `planner_unavailable`, `invalid_transition`, `insufficient_search_match`, `ungrounded_answer`로 구분한다. 공개 응답은 현재의 안전한 사용자 메시지 계약을 유지한다.

## Evaluation and Regression Prevention

### Golden question evaluation

각 질문에 다음 기대값을 고정한다.

- clarification 여부
- context action
- operation
- canonical target 또는 corpus scope
- requested fields와 required concepts
- 상위 citation
- grounded 여부
- 답변에 포함돼야 할 핵심 사실

### Conversation scenarios

다음 시나리오에서 주제 유지, clarification 재개, 주제 초기화를 검증한다.

```text
이 사람 Vercel 써봤어?
-> 블로그 주인
-> 왜 그만 썼어?
-> Leemage에서 Presigned URL을 사용한 이유는?
```

### Real planner evaluation

mock 테스트와 별도로 `.env`의 실제 planner 모델을 호출하는 평가 명령을 제공한다. 기존 배포 baseline보다 나빠진 golden 사례가 하나라도 있으면 평가를 실패시킨다. API 키가 없으면 성공으로 간주하지 않고 라이브 평가 미실행 상태를 명시한다.

### Invariant and property tests

- 새 질문은 이전 pending Intent를 재개하지 않는다.
- canonical entity는 normalizer 이후 유실되지 않는다.
- 근거가 필요한 Intent는 `none` scope를 가질 수 없다.
- 존재하지 않는 candidate ID는 거부한다.
- citation 없는 모델 답변은 사용자에게 전달되지 않는다.

### Browser E2E

- localStorage에 version 2 상태 저장
- 새로고침 후 후속 질문의 target 유지
- 독립 질문에서 새 주제로 전환
- clarification 반복 방지

## Migration Strategy

기존 워크트리의 상태형 파이프라인을 폐기하거나 전체 롤백하지 않고 계약부터 교체한다.

1. golden 질문과 실제 planner 평가를 먼저 추가해 현재 회귀를 재현한다.
2. dynamic entity catalog와 candidate matching을 추가한다.
3. planner 계약을 `contextAction + targetSelection`으로 교체한다.
4. version 2 state reducer와 invariant validator를 구현한다.
5. retrieval과 cache가 새로운 normalized Intent를 사용하도록 연결한다.
6. SDK metadata를 version 2 상태로 마이그레이션한다.
7. 구 version 1 상태와 모순된 `targetUpdate` 계약을 제거한다.
8. 전체 자동 테스트, 실제 planner 평가, 브라우저 시나리오를 통과한 뒤에만 통합한다.

각 단계는 실패 테스트를 먼저 추가하고 독립 커밋으로 남긴다. 프로젝트 고유명사 하드코딩, phrase 목록 기반 routing, default export, barrel file은 추가하지 않는다.
