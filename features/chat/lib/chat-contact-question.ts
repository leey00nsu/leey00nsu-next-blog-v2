const PRIVATE_CHAT_CONTACT = {
  ALIASES: [
    '전화번호',
    '휴대폰 번호',
    '핸드폰 번호',
    '집 주소',
    '거주지',
    '사는 곳',
    '개인 주소',
    'phone number',
    'mobile number',
    'home address',
    'residential address',
  ],
} as const

export function isPrivateChatContactQuestion(question: string): boolean {
  const normalizedQuestion = question.trim().toLowerCase()

  return PRIVATE_CHAT_CONTACT.ALIASES.some((privateContactAlias) => {
    return normalizedQuestion.includes(privateContactAlias)
  })
}
