const PGVECTOR_TEXT = {
  ARRAY_START: '[',
  ARRAY_END: ']',
  BRACE_START: '{',
  VALUE_SEPARATOR: ',',
} as const

export function buildPgvectorLiteral(values: number[]): string {
  return `${PGVECTOR_TEXT.ARRAY_START}${values.join(PGVECTOR_TEXT.VALUE_SEPARATOR)}${PGVECTOR_TEXT.ARRAY_END}`
}

/**
 * Postgres가 돌려준 vector 텍스트를 숫자 배열로 바꾼다.
 *
 * pgvector의 출력은 대괄호 형식이지만, 입력 형식인 중괄호가 섞여 들어와도 같이 처리한다.
 */
export function parsePgvectorText(vectorText: string): number[] {
  const normalizedVectorText = vectorText.startsWith(PGVECTOR_TEXT.BRACE_START)
    ? `${PGVECTOR_TEXT.ARRAY_START}${vectorText.slice(1, -1)}${PGVECTOR_TEXT.ARRAY_END}`
    : vectorText

  return JSON.parse(normalizedVectorText) as number[]
}
