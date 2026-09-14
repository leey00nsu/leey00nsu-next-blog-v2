const PRIVATE_CHAT_CONTACT = {
  ALIASES: [
    '전화번호',
    '휴대폰 번호',
    '휴대전화 번호',
    '핸드폰 번호',
    '집 주소',
    '거주지',
    '사는 곳',
    '개인 주소',
    'phone number',
    'mobile number',
    'mobile phone number',
    'cellphone number',
    'cell phone number',
    'home address',
    'residential address',
  ],
} as const

function normalizeContactText(value: string): string {
  return value.normalize('NFKC').toLowerCase().replaceAll(/\s+/gu, '')
}

export function isPrivateChatContactQuestion(question: string): boolean {
  const normalizedQuestion = normalizeContactText(question)

  return PRIVATE_CHAT_CONTACT.ALIASES.some((privateContactAlias) => {
    return normalizedQuestion.includes(
      normalizeContactText(privateContactAlias),
    )
  })
}
