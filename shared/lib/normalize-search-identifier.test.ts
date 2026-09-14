import { describe, expect, it } from 'vitest'
import * as fastCheck from 'fast-check'
import { normalizeSearchIdentifier } from './normalize-search-identifier'

describe('normalizeSearchIdentifier', () => {
  it('임의의 단어 조합에서 구분자 표기를 동일하게 비교한다', () => {
    fastCheck.assert(
      fastCheck.property(
        fastCheck.array(fastCheck.stringMatching(/^[a-z]{2,12}$/), {
          minLength: 2,
          maxLength: 5,
        }),
        (words) => {
          const expected = normalizeSearchIdentifier(words.join(' '))
          for (const separator of ['_', '-', '—', '\t']) {
            expect(
              normalizeSearchIdentifier(words.join(separator).toUpperCase()),
            ).toBe(expected)
          }
        },
      ),
    )
  })
  it('의미 있는 기호와 소수점을 삭제하지 않는다', () => {
    expect(normalizeSearchIdentifier('C++')).not.toBe(
      normalizeSearchIdentifier('C'),
    )
    expect(normalizeSearchIdentifier('v7.25')).not.toBe(
      normalizeSearchIdentifier('v725'),
    )
  })
})
