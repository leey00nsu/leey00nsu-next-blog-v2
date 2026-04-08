import { z } from 'zod'

export const CHAT_REQUEST_HANDLING_TYPES = [
  'direct_greeting',
  'direct_assistant_identity',
  'direct_contact',
  'direct_latest',
  'direct_oldest',
  'direct_current_post',
  'grounded_retrieval',
  'corpus_synthesis',
] as const

export const ChatRequestHandlingTypeSchema = z.enum(
  CHAT_REQUEST_HANDLING_TYPES,
)

export type ChatRequestHandlingType = z.infer<
  typeof ChatRequestHandlingTypeSchema
>

export const ChatQuestionRoutingResultSchema = z.object({
  handlingType: ChatRequestHandlingTypeSchema,
  reason: z.string().trim().min(1).max(160),
})

export interface ChatQuestionRoutingResult
  extends z.infer<typeof ChatQuestionRoutingResultSchema> {}
