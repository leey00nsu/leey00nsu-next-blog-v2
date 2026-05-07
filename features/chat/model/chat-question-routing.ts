import { z } from 'zod'

export const CHAT_QUESTION_SELECTORS = [
  'contact',
  'latest_post',
  'oldest_post',
  'current_source',
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

export const ChatQuestionSelectorSchema = z.enum(CHAT_QUESTION_SELECTORS)
export const ChatQuestionActionSchema = z.enum(CHAT_QUESTION_ACTIONS)

export type ChatQuestionSelector = z.infer<typeof ChatQuestionSelectorSchema>
export type ChatQuestionAction = z.infer<typeof ChatQuestionActionSchema>

export const ChatQuestionRoutingResultSchema = z.object({
  selector: ChatQuestionSelectorSchema,
  action: ChatQuestionActionSchema,
  reason: z.string().trim().min(1).max(160),
})

export interface ChatQuestionRoutingResult
  extends z.infer<typeof ChatQuestionRoutingResultSchema> {}
