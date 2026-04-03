import { describe, expect, it } from 'vitest'
import { BlogChatRequestSchema } from './chat-schema'

describe('BlogChatRequestSchema', () => {
  it('질문 길이는 200자를 넘길 수 없다', () => {
    const result = BlogChatRequestSchema.safeParse({
      question: 'a'.repeat(201),
      locale: 'ko',
    })

    expect(result.success).toBe(false)
  })
})
