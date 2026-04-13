# Planner RAG Design

**Goal:** 블로그 챗봇의 hard routing gate를 없애고, 질문 이해를 planner 기반 soft decision으로 바꿔 multi-turn과 mixed-intent 질문에서도 retrieval이 안정적으로 동작하게 만든다.

## Context

현재 챗봇은 `/api/chat`에서 질문을 먼저 `greeting`, `assistant_identity`, `retrieval`, `corpus` 같은 selector로 분류한 뒤 처리 경로를 고른다. 이 구조는 간단하지만 두 가지 문제가 있다.

- 인사와 실제 질문이 섞인 문장이 `greeting`으로 잘못 끝나면서 retrieval이 실행되지 않는다.
- 후속 질문 맥락은 `rewrite` 이후에 붙는데, 현재 분류는 그보다 먼저 실행돼서 `"이 사람 이름 뭐야?"` 같은 질문을 맥락 없이 잘못 해석할 수 있다.

## Recommendation

앞단 분류기를 없애고 별도 서비스로 빼는 대신, 같은 서버 안에서 `planner` 단계로 바꾼다. `gpt-5.4-mini`는 그대로 사용하되, 더 이상 단일 selector를 고르게 하지 않고 아래와 같은 실행 계획을 반환하게 만든다.

- `standaloneQuestion`
- `socialPreamble`
- `needsRetrieval`
- `retrievalMode`
- `action`
- `scope`
- `preferredSourceCategories`
- `needsClarification`
- `clarificationQuestion`
- `deterministicAction`

이 출력은 retrieval을 막는 hard gate가 아니라, retrieval과 direct action을 조합하는 soft signal로 사용한다.

## Architecture

### 1. Planner Layer

새 planner는 현재 질문, locale, conversation history, current post context, assistant profile을 입력으로 받아 structured output을 반환한다. 역할은 다음과 같다.

- 짧은 인사말과 실제 질문 payload를 분리한다.
- 후속 질문을 standalone question으로 복원한다.
- project/profile/blog/assistant 중 어떤 source category가 유력한지 힌트를 준다.
- retrieval이 필요한지, clarification이 필요한지, deterministic action으로 충분한지 결정한다.

### 2. Retrieval Layer

retrieval은 pure social 또는 deterministic action이 아닌 이상 기본 경로가 된다.

- lexical candidate: `selectChatSearchMatches`
- semantic candidate: `runChatRagWorkflow`
- fusion rerank: `fuseChatRetrievalMatches`

planner는 retrieval을 “막는” 것이 아니라, 어떤 쪽을 우선 보고 어떻게 merge할지 힌트를 주는 데 그친다.

### 3. Direct Action Layer

코드가 더 정확한 소수의 질의만 deterministic action으로 유지한다.

- `contact`
- `latest_post`
- `oldest_post`
- `social_reply`

`assistant_identity`는 더 이상 direct response hard gate로 두지 않는다. assistant/profile 문서를 retrieval 대상에 포함해 evidence 기반으로 답한다.

### 4. Clarification Layer

planner가 대상을 충분히 특정하지 못했다고 판단하면 retrieval 대신 clarification response를 반환한다. 예시는 다음과 같다.

- `"이 사람 이름 뭐야?"`
- 직전 근거가 project였고 현재 질문이 person/entity를 정확히 가리키지 않는 경우

clarification은 refusal이 아니라 `grounded: false`인 안내 응답으로 처리한다.

## Data Flow

1. request validation
2. planner 실행
3. planner 결과에 따라:
   - `social_reply`면 direct response
   - deterministic action이면 direct response + citation
   - clarification이면 clarification response
   - 그 외면 retrieval
4. lexical + semantic retrieval
5. fused evidence selection
6. answer generation
7. response finalization and caching

## File Boundaries

- `features/chat/model/chat-question-plan.ts`
  planner schema와 타입
- `features/chat/api/plan-chat-question.ts`
  `gpt-5.4-mini` 기반 planner + fallback planner
- `features/chat/lib/chat-question-context.ts`
  conversation history / current post context를 planner prompt와 fallback logic에 맞게 정리
- `app/api/chat/route.ts`
  planner 중심 orchestration으로 재구성
- `features/chat/lib/resolve-chat-request.ts`
  selector 기반 분기 제거, deterministic action / current post / lexical selection 역할만 남김

## Error Handling

- planner 실패 시 fallback planner가 동작해야 한다.
- fallback planner도 retrieval을 우선시해야 한다. 즉 실패 시 다시 hard gate 구조로 돌아가면 안 된다.
- clarification이 필요한데 deterministic rule로 확정할 수 없으면 무리하게 direct response를 하지 않는다.

## Testing

반드시 고정해야 할 시나리오는 다음과 같다.

- `"안녕 leesfield 라는 프로젝트 알아?"` -> retrieval 실행, project hit
- `"넌 누구야?"` -> assistant/profile retrieval 기반 응답
- `"이 사람 이름 뭐야?"` with weak context -> clarification
- `"이 글에서 구조가 왜 중요해?"` with current post context -> current post retrieval
- `"최신 글 뭐야?"` -> deterministic direct action
- `"블로그 전체를 보면 공통된 설계 철학이 뭐야?"` -> corpus retrieval

## Non-Goals

- agentic multi-step tool loop 도입
- 외부 서비스 분리
- 새로운 retrieval backend 도입
