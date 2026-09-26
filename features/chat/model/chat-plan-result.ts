import type { ChatQueryPlan } from '@/features/chat/model/chat-query-plan'

export const CHAT_JEV_ROUTES = [
  'social_reply',
  'identity',
  'owner_identity',
  'public_contact',
  'private_contact',
  'llm_planner',
] as const

export type ChatJevRoute = (typeof CHAT_JEV_ROUTES)[number]

export interface ChatJevDecision {
  route: ChatJevRoute
  confidence: number | null
}

export interface PlanChatIntentSuccessResult {
  ok: true
  queryPlan: ChatQueryPlan
  jevDecision?: ChatJevDecision | null
}

export interface PlanChatIntentFailureResult {
  ok: false
  refusalReason: 'missing_api_key' | 'model_error'
  failureKind: 'planner_unavailable' | 'invalid_intent_plan'
}

export type PlanChatIntentResult =
  | PlanChatIntentSuccessResult
  | PlanChatIntentFailureResult
