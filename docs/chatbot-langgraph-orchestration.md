# Chatbot LangGraph Orchestration Decision

## Context

The blog chatbot currently has two orchestration layers.

- `features/chat/model/answer-blog-chat-question.ts` owns application flow: request validation result handling, usage limits, question planning, cache lookup, evidence retrieval, answer generation, semantic cache storage, and observability.
- `features/chat/model/chat-rag-workflow.ts` owns semantic retrieval flow: embedding the question, loading search data, ranking chunks, and returning grounded matches.

## Decision

Keep LangGraph scoped to semantic RAG for now. Do not move the full chatbot request lifecycle into LangGraph yet.

The current application flow has meaningful branches, but they are still easier to follow as a typed function pipeline after the route, cache/limit state, citation validation, and evidence retrieval were split into separate modules. Promoting the whole flow to LangGraph would add a second orchestration vocabulary around HTTP-facing concerns without removing enough complexity.

LangGraph remains useful inside `chat-rag-workflow.ts` because that layer is a retrieval workflow with explicit state transitions: question embedding, source loading, chunk ranking, and grounded match selection.

## Revisit When

- The chatbot starts running multiple answer strategies in parallel.
- Planner output needs resumable or inspectable node-level execution.
- Evaluation requires per-node traces across validate, plan, retrieve, rerank, answer, and validate-citation stages.
- More channels reuse the same chatbot engine with different branching policies.

Until then, prefer small application-service modules over a full graph migration.
