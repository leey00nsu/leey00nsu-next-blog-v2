import '@/shared/lib/load-node-environment'
import { evaluateChatRetrieval } from '@/features/chat/model/evaluate-chat-retrieval'

async function main(): Promise<void> {
  const passed = await evaluateChatRetrieval({
    liveSemanticEvaluationEnabled:
      process.env.BLOG_CHAT_EVALUATE_LIVE_SEMANTIC === 'true',
  })
  if (!passed) process.exitCode = 1
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void main().catch((error) => {
  console.error('Failed to evaluate Chat RAG retrieval:', error)
  process.exitCode = 1
})
