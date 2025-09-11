'use client'

import { useEffect } from 'react'
import type { TocHeading } from '@/shared/lib/toc'
import { useTocContext } from '@/features/post/model/toc-context'

interface TocRegisterProps {
  headings: TocHeading[]
}

// TOC 데이터 등록용 컴포넌트
export function TocRegister({ headings }: TocRegisterProps) {
  const { setHeadings } = useTocContext()

  useEffect(() => {
    setHeadings(headings)
    return () => {
      // 페이지 전환 시 잔여 TOC가 남지 않도록 정리
      setHeadings([])
    }
  }, [headings, setHeadings])

  return null
}
