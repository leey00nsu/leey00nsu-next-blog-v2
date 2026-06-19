# LangGraph Query Plan Architecture Design

## Goal

블로그 챗봇의 질문 해석, 검색 계획, 근거 선택, 답변 생성을 하나의 결정적 LangGraph 워크플로로 통합한다. LLM은 질문의 의미만 `ChatQueryPlan`으로 표현하고, 순수한 compiler가 이를 실행 가능한 `ChatRetrievalPlan`으로 변환한다. 검색기와 답변 모델은 compiler가 확정한 범위를 바꾸지 못한다.

이 설계는 다음 문제를 해결한다.

- `최근`이 들어간 내용 질문이 최신 블로그 제목 조회로 축소되지 않아야 한다.
- `프로젝트/project` 문자열을 executor가 다시 해석하는 휴리스틱을 제거해야 한다.
- planner 출력의 비결정성을 정규화 함수 여러 개로 땐질하지 않고 하나의 compiler 계약으로 통제해야 한다.
- 수동 TypeScript 분기와 부분 LangGraph로 나뉜 오케스트레이션을 하나의 추적 가능한 그래프로 통합해야 한다.

## Non-goals

- 모델이 자유롭게 도구를 반복 호출하는 Agentic RAG를 만들지 않는다.
- 이메일 전송이나 데이터 변경과 같은 human-in-the-loop 액션을 추가하지 않는다.
- 첫 전환에서 LangGraph checkpointer로 브라우저의 대화 저장 계약을 교체하지 않는다.
- HTTP validation, daily usage limit, 인증을 graph node로 옮기지 않는다. 이들은 application boundary에 남긴다.

## Superseded Decision

`docs/chatbot-langgraph-orchestration.md`의 "semantic RAG에만 LangGraph를 적용한다"는 결정을 이 문서가 대체한다. 기존 결정 이후 planner, clarification, cache, direct response, citation validation 분기가 추가됐고, 노드 단위 관측과 계약 검증이 필요한 임계점에 도달했다.

## Architecture Boundary

```text
API route
  -> request schema validation
  -> daily usage limit
  -> invoke chat workflow

LangGraph chat workflow
  -> resolve context and entity candidates
  -> plan query meaning
  -> compile executable plan
  -> clarification | cache | direct metadata | retrieval
  -> generate grounded answer
  -> validate citations
  -> update caches and conversation state
  -> finalize application response
```

Route는 HTTP 관심사만 다룬다. Graph는 질문 하나를 답변으로 바꾸는 모든 응용 흐름의 단일 오케스트레이터가 된다. 기존 `chat-rag-workflow` 검색 graph는 main graph의 retrieval subgraph로 포함하거나 단일 retrieval node 내부의 순수 함수로 축소한다. 동일 요청에 graph 오케스트레이터를 두 개 유지하지 않는다.

## Semantic Query Contract

Planner는 검색 알고리즘이나 direct response 여부를 결정하지 않는다. 질문의 의미만 다음 계약으로 반환한다.

```ts
type ChatOperation =
  | 'lookup'
  | 'explain'
  | 'summarize'
  | 'compare'
  | 'recommend'
  | 'social_reply'
  | 'contact'

type ChatSourceSelection =
  | { mode: 'all' }
  | {
      mode: 'only' | 'prefer'
      categories: ChatSourceCategory[]
    }

type ChatTemporalSelection =
  | { mode: 'none' }
  | {
      mode: 'rank' | 'single'
      order: 'latest' | 'oldest'
    }

interface ChatQueryPlan {
  standaloneQuestion: string
  contextAction: ChatContextAction
  targetSelection: ChatTargetSelection
  operation: ChatOperation
  sourceSelection: ChatSourceSelection
  temporalSelection: ChatTemporalSelection
  requestedFields: ChatRequestedField[]
  requiredConcepts: string[]
  optionalConcepts: string[]
  missingSlots: ChatMissingSlot[]
  clarificationQuestion: string | null
  confidence: ChatConfidence
  reason: string
}
```

discriminated union으로 잘못된 상태를 schema에서부터 표현할 수 없게 한다. `all`은 category 목록을 갖지 않고, `none`은 시간 순서를 갖지 않는다.

예상 계획은 다음과 같다.

| 질문 | operation | source | temporal |
| --- | --- | --- | --- |
| `가장 최근 글이 뭐야?` | `lookup` | `only: blog` | `single: latest` |
| `최근 프로젝트에서 AI를 어떻게 활용해?` | `explain` | `only: project` | `rank: latest` |
| `요즘 AI를 어떻게 활용해?` | `explain` | `all` | `rank: latest` |
| `Leemage와 블로그의 저장 방식을 비교해줘` | `compare` | `prefer: project, blog` | `none` |

## Executable Retrieval Contract

`compileChatRetrievalPlan`은 planner 출력, canonical entity catalog, 이전 대화 상태, 현재 페이지를 입력받는 순수 함수다. LLM을 호출하지 않고 외부 상태를 읽지 않는다.

```ts
type ChatExecutionKind =
  | 'clarification'
  | 'direct_metadata'
  | 'retrieve_and_generate'
  | 'social_reply'
  | 'contact'

interface ChatRetrievalPlan {
  executionKind: ChatExecutionKind
  standaloneQuestion: string
  operation: ChatOperation
  canonicalTargets: ChatTarget[]
  sourceStrategy: 'all' | 'only' | 'prefer'
  sourceCategories: ChatSourceCategory[]
  requiredConcepts: string[]
  optionalConcepts: string[]
  requestedFields: ChatRequestedField[]
  temporalStrategy: 'none' | 'rank' | 'single'
  temporalOrder: 'latest' | 'oldest' | null
  maximumEvidenceCount: number
}
```

Compiler는 다음 불변조건을 적용한다.

- candidate ID는 catalog의 canonical target으로만 변환한다.
- target이 있으면 해당 source category를 최소 `prefer`로 승격한다.
- `direct_metadata`는 `lookup + single`이며 requested field가 `title`, `published_at`과 같은 확정적 메타데이터로만 구성될 때 허용한다.
- `explain`, `summarize`, `compare`, `recommend`는 항상 `retrieve_and_generate`를 사용한다.
- `rank`는 관련도 검색 후 시간을 정렬 신호로 사용하고, `single`은 필터 내 단일 자료를 선택한다.
- corpus 질문에서 source category는 문자열 검사로 복구하지 않는다. planner가 비어 있는 category를 낸 경우 `all`로 실행한다.
- `missingSlots`가 있는 계획은 검색하지 않고 clarification으로 종료한다.
- 의미를 바꾸어야만 교정할 수 있는 잘못된 조합은 임의 보정하지 않고 `invalid_query_plan`으로 거부한다.

## Evidence Time Contract

프로젝트 기간을 `publishedAt`으로 저장하는 임시 규칙을 제거한다. 자료별 시간의 의미를 명시한다.

```ts
type ChatEvidenceTimeKind =
  | 'published'
  | 'updated'
  | 'project_started'
  | 'project_ended'

interface ChatEvidenceTime {
  value: string
  kind: ChatEvidenceTimeKind
}
```

- blog: `published`
- 완료된 project: `project_ended`
- 진행 중 project: `updated` → 없으면 `project_started`
- profile, assistant: 유효한 시간 메타데이터가 없으면 시간 정렬에서 제외

Executor는 source category에 따라 새로운 날짜 의미를 추론하지 않고 ingestion이 제공한 `ChatEvidenceTime`만 사용한다.

## Graph State

Graph state는 입력, planner 출력, compiler 출력, 실행 결과를 분리해 노드 경계를 명확히 한다.

```ts
interface ChatWorkflowState {
  request: BlogChatRequest
  assistantProfile: ChatAssistantProfile | null
  contactProfile: ChatContactProfile | null
  entityCandidates: ChatEntityCandidate[]
  queryPlan: ChatQueryPlan | null
  retrievalPlan: ChatRetrievalPlan | null
  matches: ChatEvidenceRecord[]
  draftAnswer: BlogChatModelDraft | null
  response: BlogChatResponse | null
  nextConversationState: ChatConversationState
  cacheKind: 'none' | 'exact' | 'semantic'
  failureKind: ChatWorkflowFailureKind | null
}
```

각 node는 자신이 소유한 state key만 반환한다. 다른 node의 출력을 암묵적으로 수정하지 않는다. reducer는 메시지 축적이 필요한 키에만 사용하고 나머지는 다음 값으로 교체한다.

## Nodes and Edges

```text
START
  -> resolve-context
  -> plan-query
  -> compile-plan
  -> route-plan
       -> clarification -> finalize -> END
       -> failure       -> finalize -> END
       -> cache-lookup
            -> cache-hit -> finalize -> END
            -> direct-metadata -> validate-response
            -> contact         -> validate-response
            -> social-reply    -> validate-response
            -> retrieve-evidence
                 -> insufficient-evidence -> finalize -> END
                 -> generate-answer
                 -> validate-response
                      -> invalid-response -> finalize -> END
                      -> store-cache
                      -> finalize
                      -> END
```

### Node responsibilities

- `resolve-context`: dynamic entity catalog에서 현재 질문 후보를 선택한다.
- `plan-query`: 구조화된 `ChatQueryPlan`을 생성하고 schema 실패 시 한 번만 repair한다.
- `compile-plan`: canonical target, conversation transition, retrieval invariant를 검증한다.
- `cache-lookup`: compiled plan을 기준으로 exact/semantic cache를 조회한다.
- `direct-metadata`: compiler가 허용한 확정적 메타데이터만 답변한다.
- `retrieve-evidence`: source filter, entity filter, hybrid retrieval, concept coverage, temporal ordering, diversity, Top-K를 순서대로 실행한다.
- `generate-answer`: 선택된 근거만 모델에 전달한다.
- `validate-response`: citation URL과 grounded 상태를 검증하고 후속 질문을 구성한다.
- `store-cache`: grounded response만 exact/semantic cache에 저장한다.
- `finalize`: 단일 application response와 검증된 다음 대화 상태를 반환한다.

## Retrieval Execution Order

검색 순서는 다음으로 고정한다.

1. `only` source category 필터
2. canonical target/entity 필터
3. lexical, semantic, graph relation 후보 수집
4. required concept coverage 검증
5. `prefer` source category boost
6. semantic/lexical score fusion
7. `rank` temporal boost 또는 `single` temporal selection
8. source/slug diversity 보정
9. Top-K 절삭

`rank`는 관련도를 무시하고 새로운 자료로 대체하지 않는다. required concept coverage를 통과한 후보 내에서만 시간 신호를 적용한다. `single`은 해당 source/target 필터 안에서 단일 대상을 먼저 선택한 후 요청 필드를 응답한다.

## Conversation State and Persistence

이번 전환은 기존 version 2 `ChatConversationState`와 SDK metadata 계약을 유지한다. Graph invocation 하나가 HTTP 요청 하나와 대응하며, 입력에 이전 검증 상태를 받고 출력에 다음 상태를 반환한다.

checkpointer는 다음 조건이 생길 때 독립 설계로 도입한다.

- 요청이 30초 이상의 장기 작업으로 바뀐다.
- interrupt/resume가 필요한 사용자 확인 단계가 추가된다.
- 서버가 브라우저보다 대화 thread의 authoritative owner가 되어야 한다.

이 전환에서 checkpointer를 억지로 넣으면 익명 thread ID, 보존 기간, 개인정보 삭제, 중복 상태 소유권을 함께 해결해야 하므로 현재 문제의 필요 범위를 넘는다.

## Failure Policy

Graph는 예상 가능한 실패를 throw로 분기하지 않고 state의 `failureKind`로 기록한다.

| failure | behavior |
| --- | --- |
| `planner_unavailable` | 이전 대화 상태를 유지하고 안전한 오류 응답 |
| `invalid_query_plan` | 실행하지 않고 planner 계약 오류로 관측 |
| `invalid_candidate` | canonical target을 임의 추론하지 않음 |
| `invalid_transition` | pending clarification을 잘못 재개하지 않음 |
| `insufficient_evidence` | answer model을 호출하지 않음 |
| `answer_model_error` | citation 없는 fallback 생성 금지 |
| `ungrounded_answer` | cache와 대화 근거 상태에 저장하지 않음 |

예상하지 못한 프로그래밍 오류는 graph invocation boundary에서 한 번 캐치하고 `workflow_error`로 관측한다. node 내부에서 광범위한 catch로 버그를 정상 상태로 숨기지 않는다.

## Cache Contract

cache key는 raw question이 아니라 compiled plan을 기준으로 만든다. 다음 값을 포함한다.

- locale
- operation
- canonical target IDs
- source strategy/categories
- temporal strategy/order
- requested fields
- normalized concepts
- evidence version

`rank: latest` 프로젝트 질문과 `single: latest` 블로그 조회가 동일 cache key를 가지지 않게 한다. semantic cache는 compiled source/target/temporal fingerprint가 같은 경우에만 재사용한다.

## Observability

각 요청에 다음 단계를 분리해 기록한다.

- planner latency와 schema repair 여부
- raw query plan의 안전한 필드
- compiler 결과와 failure kind
- graph node 경로
- cache kind
- retrieval source categories, temporal strategy, match count
- answer/citation validation 결과

질문 원문, 답변 전문, 비밀 환경 변수는 새로운 로그에 추가하지 않는다. LangSmith는 필수 의존성이 아니다. 현재 관측 저장소를 기본으로 유지하고, LangSmith tracing은 환경 설정이 있을 때만 활성화할 수 있다.

## Testing and Evaluation

### Contract tests

- discriminated union이 invalid source/temporal shape을 거부한다.
- compiler는 동일 query plan에 항상 동일 retrieval plan을 반환한다.
- 존재하지 않는 candidate와 잘못된 clarification transition을 거부한다.
- direct metadata 조건이 아닌 내용 질문은 항상 retrieval을 통과한다.

### Retrieval matrix

| axis | cases |
| --- | --- |
| source | project, blog, profile, all, multiple |
| temporal | none, rank latest, rank oldest, single latest, single oldest |
| operation | lookup, explain, summarize, compare, recommend |
| context | reset, continue, clarification resolution, target change |

핵심 조합을 pairwise fixture로 고정하고 다음 골든 사례는 항상 포함한다.

- `최근 프로젝트에서 AI를 어떻게 활용하고 있어?`
- `가장 최근 글의 제목과 날짜를 알려줘`
- `최근 AI 글들을 요약해줘`
- `Leemage와 Leesfield의 저장 방식을 비교해줘`
- `요즘 주력 기술 스택이 뭐야?`

### Graph tests

- 각 execution kind이 예상한 conditional edge로만 진입한다.
- cache hit은 retrieval과 answer model을 호출하지 않는다.
- insufficient evidence는 generate node를 호출하지 않는다.
- ungrounded answer는 cache에 저장하지 않는다.
- planner/compiler 실패는 이전 대화 상태를 바꾸지 않는다.

### Live and browser evaluation

- 실제 planner로 query plan 필드와 graph path를 검증한다.
- retrieval recall@1/3/5와 MRR 기준을 현재 1.0 baseline 아래로 떨어뜨리지 않는다.
- 브라우저에서 golden 질문, clarification, target reset, 새로고침 후 상태 유지를 검증한다.
- 응답은 올바른 source category의 citation을 포함해야 한다.

## Migration Strategy

전환은 하나의 브랜치에서 진행하되 각 단계를 독립 커밋과 실패 테스트로 남긴다.

1. 새 query/retrieval schema와 golden contract fixture를 추가한다.
2. 순수 `compileChatRetrievalPlan`과 property/unit test를 구현한다.
3. 새 retrieval executor를 구현하고 기존 검색 baseline과 대조한다.
4. main `StateGraph`와 conditional edge를 구현한다.
5. cache, answer generation, citation validation을 graph node에 연결한다.
6. API application service가 새 graph만 호출하도록 전환한다.
7. 기존 `NormalizedChatIntent`, `resolvePreferredSourceCategories`, chronological 휴리스틱, 수동 pipeline을 제거한다.
8. `publishedAt`으로 프로젝트 기간을 표현하는 임시 적응을 `ChatEvidenceTime`으로 교체한다.
9. 정적 검사, 전체 테스트, retrieval/planner 평가, 빌드, 브라우저 golden 시나리오를 통과한다.
10. 구 계약과 더 이상 사용하지 않는 테스트/fixture를 삭제한다.

구계약 경로와 새 계약 경로를 영구적으로 병행 운영하지 않는다. 개발 중 비교 테스트를 위해 기존 executor를 호출할 수는 있지만, application entry point 전환 후에는 새 graph가 단일 실행 경로가 된다.

## Acceptance Criteria

- application entry point가 단일 LangGraph workflow를 호출한다.
- planner가 `ChatQueryPlan` discriminated union을 생성한다.
- compiler가 `ChatRetrievalPlan`을 결정적으로 생성한다.
- executor에 source category 키워드 감지가 없다.
- `single` 메타데이터 조회와 `rank` 내용 검색이 다른 graph path를 사용한다.
- 프로젝트 시간을 `publishedAt`으로 위장하지 않는다.
- 기존 golden 질문과 대화 상태 시나리오가 통과한다.
- retrieval recall@1/3/5와 MRR이 기존 baseline보다 낮아지지 않는다.
- 참조되지 않는 구 Intent 정규화기, 휴리스틱, 수동 pipeline이 제거된다.
- `pnpm exec tsc --noEmit`, ESLint, 전체 Vitest, planner/retrieval evaluation, `pnpm build`, 브라우저 검증을 통과한다.
