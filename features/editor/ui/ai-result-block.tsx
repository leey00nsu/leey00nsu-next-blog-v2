'use client'

/**
 * AIResultBlock 컴포넌트
 *
 * AI 처리 결과를 표시하는 블록입니다.
 * 로딩 중에는 스켈레톤 효과, 완료 시 결과 + 액션 버튼을 표시합니다.
 */

import { useState, useEffect } from 'react'
import { Check, Plus, X, Sparkles } from 'lucide-react'
import { Button } from '@/shared/ui/button'

interface AIResultBlockProps {
  isLoading: boolean
  result: string | null
  error: string | null
  onReplace: () => void
  onInsertBelow: () => void
  onCancel: () => void
}

export function AIResultBlock({
  isLoading,
  result,
  error,
  onReplace,
  onInsertBelow,
  onCancel,
}: AIResultBlockProps) {
  const [skeletonWidths, setSkeletonWidths] = useState<number[]>([])

  // 스켈레톤 라인 너비를 무작위로 생성 (스트리밍 느낌)
  useEffect(() => {
    if (isLoading) {
      const generateWidths = () => {
        const lineCount = Math.floor(Math.random() * 2) + 2 // 2-3줄
        return Array.from(
          { length: lineCount },
          () => Math.floor(Math.random() * 40) + 60, // 60-100%
        )
      }
      setSkeletonWidths(generateWidths())

      // 주기적으로 스켈레톤 업데이트하여 스트리밍 느낌 제공
      const interval = setInterval(() => {
        setSkeletonWidths(generateWidths())
      }, 800)

      return () => clearInterval(interval)
    }
  }, [isLoading])

  return (
    <div className="ai-result-block my-3 rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-900">
      {/* 헤더 */}
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        <Sparkles size={14} className={isLoading ? 'animate-pulse' : ''} />
        <span>
          {isLoading ? 'AI가 작성 중...' : error ? 'AI 오류' : 'AI 제안'}
        </span>
      </div>

      {/* 컨텐츠 영역 */}
      <div className="min-h-[60px] rounded-md bg-gray-50 p-3 dark:bg-gray-800">
        {isLoading && (
          <div className="space-y-2">
            {skeletonWidths.map((width, index) => (
              <div
                key={index}
                className="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700"
                style={{
                  width: `${width}%`,
                  animationDelay: `${index * 150}ms`,
                }}
              />
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {result && !isLoading && !error && (
          <p className="text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-200">
            {result}
          </p>
        )}
      </div>

      {/* 액션 버튼 - 왼쪽 정렬, 여백 확대 */}
      {result && !isLoading && !error && (
        <div className="mt-4 flex items-center justify-start gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
          <Button size="sm" variant="default" onClick={onReplace}>
            <Check size={14} className="mr-1" />
            교체
          </Button>
          <Button size="sm" variant="outline" onClick={onInsertBelow}>
            <Plus size={14} className="mr-1" />
            아래에 삽입
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            <X size={14} className="mr-1" />
            취소
          </Button>
        </div>
      )}

      {/* 로딩/에러 시 취소 버튼 - 왼쪽 정렬, 여백 확대 */}
      {(isLoading || error) && (
        <div className="mt-4 flex justify-start border-t border-gray-200 pt-4 dark:border-gray-700">
          <Button size="sm" variant="ghost" onClick={onCancel}>
            <X size={14} className="mr-1" />
            취소
          </Button>
        </div>
      )}
    </div>
  )
}
