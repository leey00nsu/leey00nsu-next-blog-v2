# Chatbot LangGraph Orchestration

> Status: Implemented. The approved contract is documented in
> `docs/superpowers/specs/2026-06-19-langgraph-query-plan-design.md`.

## Decision

The chatbot uses one application-level LangGraph workflow. LangGraph owns the
branching lifecycle after HTTP validation and usage limiting:

```text
resolve-context -> plan-query -> compile-plan
  -> execute-direct
  -> cache-lookup -> retrieve-evidence -> generate-answer
  -> validate-response -> store-cache -> finalize
```

The graph branches on the compiled `ChatRetrievalPlan.executionKind`, not on
question keywords. `ChatQueryPlan` describes user meaning and a pure compiler
resolves canonical targets, source strategy, temporal strategy, execution kind,
and the next conversation state.

## Boundaries

- `answer-blog-chat-question.ts` keeps request validation, rate limiting,
  concurrent/daily limits, cache cleanup, profile loading, and observability
  outside the graph.
- `chat-workflow.ts` is the single application orchestrator.
- `chat-rag-workflow.ts` is a retrieval computation called by the executor. It
  does not own application decisions.
- `execute-chat-retrieval-plan.ts` applies compiled source and temporal
  constraints before answer generation.
- Citation validation is required before a generated answer can be cached.

## Contracts

- `ChatQueryPlan`: planner-owned semantic description.
- `ChatRetrievalPlan`: compiler-owned executable description.
- `ChatConversationState`: version 2 state containing `focusedTarget`,
  `lastQueryPlan`, and an optional `suspendedQueryPlan` clarification.

The removed `NormalizedChatIntent` and manual stateful pipeline are not kept as
compatibility layers. This avoids two competing sources of execution meaning.

## Observability

Each application result records the query operation, compiled source and
temporal strategies, execution kind, graph path, retrieval matches, cache kind,
citations, refusal reason, and duration. Source and time semantics are copied
from the plans rather than reconstructed from the original question.
