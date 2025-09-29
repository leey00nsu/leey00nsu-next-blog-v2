import { LOCALES, SupportedLocale } from '@/shared/config/constants'

function normalizeLocale(locale: string | null | undefined): string | null {
  if (!locale) {
    return null
  }

  return locale.toLowerCase()
}

export function determineSupportedLocale(
  candidates: Array<string | null | undefined>,
): SupportedLocale {
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeLocale(candidate)
    if (!normalizedCandidate) {
      continue
    }

    if (LOCALES.SUPPORTED.includes(normalizedCandidate as SupportedLocale)) {
      return normalizedCandidate as SupportedLocale
    }
  }

  return LOCALES.DEFAULT
}
