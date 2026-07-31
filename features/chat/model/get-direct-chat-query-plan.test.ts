import { describe, expect, it } from 'vitest'
import { getDirectChatQueryPlan } from '@/features/chat/model/get-direct-chat-query-plan'

describe('getDirectChatQueryPlan', () => {
  it.each([
    '블로그 주인의 전화번호를 알려줘',
    '이윤수 집 주소가 어디야?',
    'What is the author home address?',
  ])(
    '비공개 연락처 질문 "%s"은 clarification 없이 직접 거절 경로로 보낸다',
    (question) => {
      expect(getDirectChatQueryPlan(question)).toMatchObject({
        operation: 'contact',
        targetSelection: { kind: 'none' },
        missingSlots: [],
        requestedFields: ['contact_methods'],
      })
    },
  )

  it.each([
    '너는 작성자와 무슨 관계야?',
    '작성자와의 관계가 뭐야?',
    'What is your relationship with the author?',
  ])('관계 질문 "%s"은 정체성 직접 응답으로 보낸다', (question) => {
    expect(getDirectChatQueryPlan(question)).toMatchObject({
      operation: 'identity',
      targetSelection: { kind: 'none' },
      missingSlots: [],
    })
  })

  it.each([
    '이 블로그 주인은 누구야?',
    '블로그 작성자 이름이 뭐야?',
    'Who is the blog owner?',
  ])('작성자 이름 질문 "%s"은 owner 직접 응답으로 보낸다', (question) => {
    expect(getDirectChatQueryPlan(question)).toMatchObject({
      operation: 'owner_identity',
      targetSelection: { kind: 'none' },
      missingSlots: [],
    })
  })

  it.each([
    '최근 어디에서 일했어?',
    '이윤수는 어디에서 근무했어?',
    '최근 직장은 어디야?',
    '작성자의 최신 경력을 알려줘',
  ])('최근 근무처 질문 "%s"은 profile 직접 검색으로 보낸다', (question) => {
    expect(getDirectChatQueryPlan(question)).toMatchObject({
      contextAction: 'reset',
      operation: 'lookup',
      sourceSelection: { mode: 'only', categories: ['profile'] },
      temporalSelection: { mode: 'single', order: 'latest' },
      requestedFields: ['content'],
      missingSlots: [],
    })
  })
})
