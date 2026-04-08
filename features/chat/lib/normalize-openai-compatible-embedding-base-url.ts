const OPEN_AI_COMPATIBLE_VERSION_PATH = '/v1'
const TRAILING_SLASH_PATTERN = /\/+$/

export function normalizeOpenAiCompatibleEmbeddingBaseUrl(
  baseUrl: string,
): string {
  if (!baseUrl) {
    return baseUrl
  }

  const normalizedBaseUrl = baseUrl.replace(TRAILING_SLASH_PATTERN, '')

  if (
    normalizedBaseUrl.endsWith(OPEN_AI_COMPATIBLE_VERSION_PATH)
  ) {
    return normalizedBaseUrl
  }

  return `${normalizedBaseUrl}${OPEN_AI_COMPATIBLE_VERSION_PATH}`
}
