import { describe, expect, it } from 'vitest'
import * as fastCheck from 'fast-check'
import { splitBoundedMarkdownContent } from './split-bounded-markdown-content'

describe('splitBoundedMarkdownContent', () => {
  it('임의 길이의 본문에서 뒤쪽 단어를 버리지 않고 청크 상한을 지킨다', () => {
    fastCheck.assert(
      fastCheck.property(
        fastCheck.array(fastCheck.stringMatching(/^[a-z]{2,10}$/), {
          minLength: 1,
          maxLength: 100,
        }),
        fastCheck.integer({ min: 16, max: 100 }),
        (words, limit) => {
          const chunks = splitBoundedMarkdownContent(words.join(' '), limit)
          expect(chunks.every((chunk) => chunk.length <= limit)).toBe(true)
          expect(chunks.join(' ').split(/\s+/u)).toEqual(words)
        },
      ),
    )
  })
  it('예산 안의 코드와 표는 블록 내부에서 자르지 않는다', () => {
    const code = '```sh\nrun_worker --limit 7\n```'
    const table = '| item | value |\n| --- | --- |\n| delay | 7.25 |'
    const chunks = splitBoundedMarkdownContent(
      `${'background '.repeat(20)}\n\n${code}\n\n${table}`,
      64,
    )
    expect(chunks.some((chunk) => chunk.includes(code))).toBe(true)
    expect(chunks.some((chunk) => chunk.includes(table))).toBe(true)
  })
})
