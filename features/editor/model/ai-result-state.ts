'use client'

/**
 * AI 결과 상태 타입 및 초기값
 *
 * TiptapEditor와 AIBubbleMenu에서 공유하는 AI 결과 상태입니다.
 */

export interface AIResultState {
  isVisible: boolean
  isLoading: boolean
  result: string | null
  error: string | null
  originalText: string
  originalFrom: number
  originalTo: number
  position: { top: number; left: number }
}

export const INITIAL_AI_STATE: AIResultState = {
  isVisible: false,
  isLoading: false,
  result: null,
  error: null,
  originalText: '',
  originalFrom: 0,
  originalTo: 0,
  position: { top: 0, left: 0 },
}
