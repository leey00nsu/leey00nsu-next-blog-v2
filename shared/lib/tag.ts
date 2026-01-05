/** 태그 처리 유틸 (순수 함수) */

import { TAG } from '@/shared/config/constants'

export function normalizeTag(tag: string): string {
  return tag.trim()
}

export function hasTag(list: string[], tag: string): boolean {
  const t = normalizeTag(tag).toLowerCase()
  return list.some((v) => v.toLowerCase() === t)
}

export function addTag(list: string[], tag: string): string[] {
  const t = normalizeTag(tag)
  if (!t) return list
  if (hasTag(list, t)) return list
  return [...list, t]
}

export function removeTag(list: string[], tag: string): string[] {
  return list.filter((v) => v !== tag)
}

export function availableSuggestions(
  current: string[],
  suggestions: string[] = [],
  limit: number = TAG.SUGGESTION_LIMIT,
): string[] {
  const set = new Set(current.map((v) => v.toLowerCase()))
  return suggestions
    .filter(Boolean)
    .filter((s) => !set.has(s.toLowerCase()))
    .slice(0, limit)
}
