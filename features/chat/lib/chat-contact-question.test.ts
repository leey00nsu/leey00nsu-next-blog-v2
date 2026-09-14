import { describe, expect, it } from 'vitest'
import { isPrivateChatContactQuestion } from './chat-contact-question'

describe('isPrivateChatContactQuestion', () => {
  it.each([
    '휴대전화번호',
    '휴대 전화 번호',
    '전화 번호',
    'CELL PHONE NUMBER',
    'home\taddress',
  ])('비공개 연락처 표현 %s의 띄어쓰기를 정규화한다', (contact) => {
    expect(isPrivateChatContactQuestion(`Could you share ${contact}?`)).toBe(
      true,
    )
  })
  it.each(['email', 'GitHub profile', 'LinkedIn', '프로젝트 주소'])(
    '공개 채널 %s는 비공개로 분류하지 않는다',
    (contact) => {
      expect(isPrivateChatContactQuestion(contact)).toBe(false)
    },
  )
})
