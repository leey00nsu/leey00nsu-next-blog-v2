import type { Pool } from 'pg'
import {
  activateChatRagIndexRun,
  prepareChatRagIndexValidation,
} from '@/features/chat/model/chat-rag-database'

export async function validateAndActivateChatRagIndex(params: {
  databasePool: Pool
  indexVersion: string
  embeddingDimension: number
  validateIndex: (indexVersion: string) => Promise<boolean>
}): Promise<void> {
  await prepareChatRagIndexValidation({
    databaseClient: params.databasePool,
    indexVersion: params.indexVersion,
    embeddingDimension: params.embeddingDimension,
  })
  if (!(await params.validateIndex(params.indexVersion))) {
    throw new Error(
      'Candidate index failed retrieval validation. The active index was not changed.',
    )
  }
  const databaseClient = await params.databasePool.connect()
  try {
    await activateChatRagIndexRun({
      databaseClient,
      indexVersion: params.indexVersion,
      embeddingDimension: params.embeddingDimension,
    })
  } finally {
    databaseClient.release()
  }
}
