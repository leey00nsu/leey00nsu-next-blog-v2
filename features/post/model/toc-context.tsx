'use client'

import React, { createContext, useContext, useState } from 'react'
import type { TocHeading } from '@/shared/lib/toc'

interface TocContextValue {
  headings: TocHeading[]
  setHeadings: (next: TocHeading[]) => void
}

const TocContext = createContext<TocContextValue | null>(null)

interface TocProviderProps {
  children?: React.ReactNode
}

export function TocProvider({ children }: TocProviderProps) {
  const [headings, setHeadings] = useState<TocHeading[]>([])

  return (
    <TocContext.Provider value={{ headings, setHeadings }}>
      {children}
    </TocContext.Provider>
  )
}

export function useTocContext(): TocContextValue {
  const ctx = useContext(TocContext)
  if (!ctx) {
    throw new Error('useTocContext must be used within TocProvider')
  }
  return ctx
}

