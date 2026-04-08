import { embed, embedMany } from 'ai'
import { createOpenAI, openai } from '@ai-sdk/openai'
import { CHAT_RAG } from '@/features/chat/config/chat-rag'

function createModalEmbeddingHeaders(): Record<string, string> | undefined {
  const modalEmbeddingKey = process.env.MODAL_EMBEDDING_KEY
  const modalEmbeddingSecret = process.env.MODAL_EMBEDDING_SECRET

  if (!modalEmbeddingKey || !modalEmbeddingSecret) {
    return undefined
  }

  return {
    'Modal-Key': modalEmbeddingKey,
    'Modal-Secret': modalEmbeddingSecret,
  }
}

const MODAL_EMBEDDING_PROVIDER = createOpenAI({
  baseURL: CHAT_RAG.EMBEDDING.MODAL_BASE_URL,
  apiKey: process.env.MODAL_EMBEDDING_API_KEY ?? 'modal-local',
  headers: createModalEmbeddingHeaders(),
})

function getEmbeddingModel() {
  if (CHAT_RAG.EMBEDDING.PROVIDER === 'modal') {
    return MODAL_EMBEDDING_PROVIDER.embedding(
      CHAT_RAG.EMBEDDING.MODEL_ID,
    )
  }

  return openai.embedding(CHAT_RAG.EMBEDDING.MODEL_ID)
}

export function isChatRagEmbeddingConfigured(): boolean {
  if (CHAT_RAG.EMBEDDING.PROVIDER === 'modal') {
    return Boolean(CHAT_RAG.EMBEDDING.MODAL_BASE_URL)
  }

  return Boolean(process.env.OPENAI_API_KEY)
}

export async function embedChatRagQuestion(
  question: string,
): Promise<number[]> {
  const { embedding } = await embed({
    model: getEmbeddingModel(),
    value: question,
  })

  return embedding
}

export async function embedChatRagTexts(
  texts: string[],
): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: getEmbeddingModel(),
    values: texts,
  })

  return embeddings
}
