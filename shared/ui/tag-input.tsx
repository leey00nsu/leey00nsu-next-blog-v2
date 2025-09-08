'use client'

import React, { useMemo, useRef, useState } from 'react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { addTag, availableSuggestions, removeTag } from '@/shared/lib/tag'

interface TagInputProps {
  value: string[]
  onChange: (next: string[]) => void
  suggestions?: string[]
  placeholder?: string
}

export function TagInput({
  value,
  onChange,
  suggestions,
  placeholder,
}: TagInputProps) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const available = useMemo(
    () => availableSuggestions(value, suggestions ?? [], 20),
    [suggestions, value],
  )

  function add(tag: string) {
    const next = addTag(value, tag)
    if (next !== value) {
      onChange(next)
      setInput('')
      inputRef.current?.focus()
    }
  }

  function remove(tag: string) {
    onChange(removeTag(value, tag))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(input)
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      remove(value.at(-1) ?? '')
    }
  }

  return (
    <div className="space-y-2">
      <div className="border-input bg-background flex flex-wrap gap-2 rounded-md border p-2">
        {value.map((tag) => (
          <Badge key={tag} variant="outline" className="pr-0">
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground ml-1 rounded px-1"
              aria-label={`${tag} 제거`}
            >
              x
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? '태그 입력 후 Enter'}
          className="min-w-40 flex-1 bg-transparent px-2 py-1 text-sm outline-none"
        />
      </div>
      {available.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {available.map((t) => (
            <Button
              key={t}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => add(t)}
            >
              + {t}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
