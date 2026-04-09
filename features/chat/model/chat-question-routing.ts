import { z } from 'zod'

export const CHAT_QUESTION_SELECTORS = [
  'greeting',
  'assistant_identity',
  'contact',
  'latest_post',
  'oldest_post',
  'current_post',
  'retrieval',
  'corpus',
] as const

export const CHAT_QUESTION_ACTIONS = [
  'answer',
  'summarize',
  'explain',
  'recommend',
  'compare',
] as const

export const CHAT_QUESTION_SCOPES = ['global', 'current_page'] as const

export const ChatQuestionSelectorSchema = z.enum(CHAT_QUESTION_SELECTORS)
export const ChatQuestionActionSchema = z.enum(CHAT_QUESTION_ACTIONS)
export const ChatQuestionScopeSchema = z.enum(CHAT_QUESTION_SCOPES)

export type ChatQuestionSelector = z.infer<typeof ChatQuestionSelectorSchema>
export type ChatQuestionAction = z.infer<typeof ChatQuestionActionSchema>
export type ChatQuestionScope = z.infer<typeof ChatQuestionScopeSchema>

export const ChatQuestionRoutingResultSchema = z.object({
  selector: ChatQuestionSelectorSchema,
  action: ChatQuestionActionSchema,
  scope: ChatQuestionScopeSchema,
  reason: z.string().trim().min(1).max(160),
})

export interface ChatQuestionRoutingResult
  extends z.infer<typeof ChatQuestionRoutingResultSchema> {}
