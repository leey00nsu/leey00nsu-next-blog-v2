import path from 'node:path'
import { cache } from 'react'
import {
  ChatAssistantProfileSchema,
  type ChatAssistantProfile,
} from '@/features/chat/model/chat-assistant'
import { CHAT_ASSISTANT } from '@/features/chat/config/chat-assistant'
import { readLocalizedMdxFromDir } from '@/shared/lib/mdx/reader'
import { LOCALES, type SupportedLocale } from '@/shared/config/constants'

export const getChatAssistantProfile = cache(
  (locale: SupportedLocale = LOCALES.DEFAULT): ChatAssistantProfile | null => {
    const mdxResult = readLocalizedMdxFromDir(
      path.join(process.cwd(), CHAT_ASSISTANT.CONTENT.ROOT_DIR),
      '.',
      CHAT_ASSISTANT.CONTENT.FILE_BASENAME,
      locale,
      LOCALES.DEFAULT,
    )

    if (!mdxResult) {
      return null
    }

    return ChatAssistantProfileSchema.parse({
      ...(mdxResult.data as Record<string, unknown>),
      content: mdxResult.content,
    })
  },
)
