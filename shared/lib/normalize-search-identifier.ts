const SEARCH_IDENTIFIER = {
  SEPARATORS: /[\s_\p{Pd}]+/gu,
} as const

/** Compare identifier spelling without changing the evidence shown to the model. */
export function normalizeSearchIdentifier(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replaceAll(SEARCH_IDENTIFIER.SEPARATORS, '')
}
