import type { ChatQueryPlan } from '@/features/chat/model/chat-query-plan'

export interface PlanChatIntentSuccessResult {
  ok: true
  queryPlan: ChatQueryPlan
}

export interface PlanChatIntentFailureResult {
  ok: false
  refusalReason: 'missing_api_key' | 'model_error'
  failureKind: 'planner_unavailable' | 'invalid_intent_plan'
}

export type PlanChatIntentResult =
  | PlanChatIntentSuccessResult
  | PlanChatIntentFailureResult
