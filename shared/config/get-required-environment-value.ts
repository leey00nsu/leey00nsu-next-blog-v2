interface GetRequiredEnvironmentValueParams {
  variableNames: readonly string[]
  values: readonly (string | undefined)[]
}

export function getRequiredEnvironmentValue({
  variableNames,
  values,
}: GetRequiredEnvironmentValueParams): string {
  for (const value of values) {
    const normalizedValue = value?.trim()

    if (normalizedValue) {
      return normalizedValue
    }
  }

  throw new Error(`${variableNames.join(' or ')} is required.`)
}
