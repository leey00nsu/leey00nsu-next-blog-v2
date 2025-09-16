'use client'

import { Ellipsis, Moon, Sun } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={className}
        aria-label="change theme"
      >
        <Ellipsis aria-hidden />
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={className}
      aria-label={isDark ? 'change to light theme' : 'change to dark theme'}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  )
}
