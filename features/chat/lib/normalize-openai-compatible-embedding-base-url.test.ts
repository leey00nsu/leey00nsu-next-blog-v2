import { describe, expect, it } from 'vitest'
import { normalizeOpenAiCompatibleEmbeddingBaseUrl } from '@/features/chat/lib/normalize-openai-compatible-embedding-base-url'

describe('normalizeOpenAiCompatibleEmbeddingBaseUrl', () => {
  it('루트 endpoint를 OpenAI 호환 v1 base url로 정규화한다', () => {
    expect(
      normalizeOpenAiCompatibleEmbeddingBaseUrl(
        'https://example.modal.run',
      ),
    ).toBe('https://example.modal.run/v1')
  })

  it('이미 v1이 있으면 그대로 유지한다', () => {
    expect(
      normalizeOpenAiCompatibleEmbeddingBaseUrl(
        'https://example.modal.run/v1',
      ),
    ).toBe('https://example.modal.run/v1')
  })

  it('끝의 슬래시는 제거한 뒤 v1을 붙인다', () => {
    expect(
      normalizeOpenAiCompatibleEmbeddingBaseUrl(
        'https://example.modal.run/',
      ),
    ).toBe('https://example.modal.run/v1')
  })

  it('빈 문자열은 그대로 유지한다', () => {
    expect(normalizeOpenAiCompatibleEmbeddingBaseUrl('')).toBe('')
  })
})
