'use client'

import { TocHeading } from '@/shared/lib/toc'
import { useEffect, useState, useRef } from 'react'
import { useTranslations } from 'next-intl'

interface TocProps {
  headings: TocHeading[]
  className?: string
}

export function Toc({ headings, className }: TocProps) {
  const t = useTranslations('post.toc')
  const [activeId, setActiveId] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        let currentId: string | null = null

        for (let i = headings.length - 1; i >= 0; i--) {
          const heading = headings[i]
          const element = document.querySelector(`#${heading.slug}`)
          if (element) {
            const rect = element.getBoundingClientRect()
            if (rect.top <= 64) {
              currentId = heading.slug
              break
            }
          }
        }
        setActiveId(currentId)
      }, 100)
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [headings])

  const handleClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    slug: string,
  ) => {
    e.preventDefault()
    const element = document.querySelector(`#${slug}`)
    if (element) {
      const rect = element.getBoundingClientRect()
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const targetTop = rect.top + scrollTop - 64
      window.scrollTo({
        top: targetTop,
        behavior: 'smooth',
      })
    }
    setActiveId(slug)
  }

  if (headings.length === 0) {
    return null
  }

  return (
    <nav className={className}>
      <h2 className="mb-2 font-semibold">{t('title')}</h2>
      <ul className="space-y-2">
        {headings.map((heading) => (
          <li
            key={heading.slug}
            style={{ paddingLeft: `${(heading.depth - 2) * 1}rem` }}
          >
            <a
              href={`#${heading.slug}`}
              onClick={(e) => handleClick(e, heading.slug)}
              className={`text-sm transition-colors ${
                activeId === heading.slug
                  ? 'text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
