import { getRequiredEnvironmentValue } from '@/shared/config/get-required-environment-value'

const BLOG_CHAT_MODEL_ENVIRONMENT_VARIABLE = {
  ANSWER: 'OPENAI_BLOG_CHAT_MODEL',
  TRANSLATION: 'OPENAI_MDX_MODEL',
  PLANNER: 'OPENAI_BLOG_CHAT_ROUTER_MODEL',
  RERANK: 'OPENAI_BLOG_CHAT_RERANK_MODEL',
} as const

export function getBlogChatAnswerModel(): string {
  return getRequiredEnvironmentValue({
    variableNames: [
      BLOG_CHAT_MODEL_ENVIRONMENT_VARIABLE.ANSWER,
      BLOG_CHAT_MODEL_ENVIRONMENT_VARIABLE.TRANSLATION,
    ],
    values: [
      process.env.OPENAI_BLOG_CHAT_MODEL,
      process.env.OPENAI_MDX_MODEL,
    ],
  })
}

export function getBlogChatPlannerModel(): string {
  return getRequiredEnvironmentValue({
    variableNames: [
      BLOG_CHAT_MODEL_ENVIRONMENT_VARIABLE.PLANNER,
      BLOG_CHAT_MODEL_ENVIRONMENT_VARIABLE.ANSWER,
    ],
    values: [
      process.env.OPENAI_BLOG_CHAT_ROUTER_MODEL,
      process.env.OPENAI_BLOG_CHAT_MODEL,
    ],
  })
}

export function getBlogChatRerankModel(): string {
  return getRequiredEnvironmentValue({
    variableNames: [
      BLOG_CHAT_MODEL_ENVIRONMENT_VARIABLE.RERANK,
      BLOG_CHAT_MODEL_ENVIRONMENT_VARIABLE.ANSWER,
    ],
    values: [
      process.env.OPENAI_BLOG_CHAT_RERANK_MODEL,
      process.env.OPENAI_BLOG_CHAT_MODEL,
    ],
  })
}
