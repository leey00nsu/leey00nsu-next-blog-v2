interface ValidateChatRagEmbeddingBatchParams {
  embeddings: number[][]
  expectedEmbeddingCount: number
  expectedEmbeddingDimension?: number
}

export function validateChatRagEmbeddingBatch({
  embeddings,
  expectedEmbeddingCount,
  expectedEmbeddingDimension,
}: ValidateChatRagEmbeddingBatchParams): number {
  if (embeddings.length !== expectedEmbeddingCount) {
    throw new Error(
      `Embedding provider returned ${embeddings.length} embedding(s) for ${expectedEmbeddingCount} input(s).`,
    )
  }

  const embeddingDimension = embeddings[0]?.length ?? 0

  if (embeddingDimension === 0) {
    throw new Error('Embedding provider returned an empty embedding.')
  }

  if (
    expectedEmbeddingDimension !== undefined &&
    embeddingDimension !== expectedEmbeddingDimension
  ) {
    throw new Error(
      `Embedding dimension changed from ${expectedEmbeddingDimension} to ${embeddingDimension} during indexing.`,
    )
  }

  for (const embedding of embeddings) {
    if (embedding.length !== embeddingDimension) {
      throw new Error('Embedding provider returned inconsistent dimensions.')
    }

    if (embedding.some((value) => !Number.isFinite(value))) {
      throw new Error('Embedding provider returned a non-finite value.')
    }
  }

  return embeddingDimension
}
