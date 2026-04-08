import z from 'zod'

export const ChatAssistantProfileMetaSchema = z.object({
  title: z.string().default('블로그 챗봇 안내'),
  description: z.string().optional(),
  chatbotName: z.string().min(1),
  ownerName: z.string().min(1),
  greetingAnswer: z.string().min(1),
  identityAnswer: z.string().min(1),
  aliases: z.array(z.string()).default([]),
})

export const ChatAssistantProfileSchema = ChatAssistantProfileMetaSchema.extend({
  content: z.string(),
})

export interface ChatAssistantProfile
  extends z.infer<typeof ChatAssistantProfileSchema> {}
