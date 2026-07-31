import { z } from 'zod'

export const BlogChatProgressStageSchema = z.enum([
  'understanding_question',
  'checking_sources',
  'searching_evidence',
  'selecting_evidence',
  'generating_answer',
  'validating_answer',
])

export type BlogChatProgressStage = z.infer<
  typeof BlogChatProgressStageSchema
>

export const BlogChatProgressSourceSchema = z.object({
  title: z.string().trim().min(1),
  url: z.string().trim().min(1),
  sourceCategory: z.enum(['blog', 'profile', 'project', 'assistant']),
  sectionTitle: z.string().trim().min(1).nullable().optional(),
})

export type BlogChatProgressSource = z.infer<
  typeof BlogChatProgressSourceSchema
>

export const BlogChatProgressEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('stage'),
    stage: BlogChatProgressStageSchema,
  }),
  z.object({
    type: z.literal('sources'),
    sources: z.array(BlogChatProgressSourceSchema),
  }),
  z.object({
    type: z.literal('completed'),
    elapsedMilliseconds: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal('failed'),
  }),
])

export type BlogChatProgressEvent = z.infer<
  typeof BlogChatProgressEventSchema
>

export const BlogChatProgressStageStateSchema = z.object({
  stage: BlogChatProgressStageSchema,
  status: z.enum(['active', 'completed']),
})

export const BlogChatProgressTraceSchema = z.object({
  stages: z.array(BlogChatProgressStageStateSchema),
  sources: z.array(BlogChatProgressSourceSchema),
  elapsedMilliseconds: z.number().int().nonnegative().nullable(),
  failed: z.boolean(),
})

export type BlogChatProgressTrace = z.infer<
  typeof BlogChatProgressTraceSchema
>

export const EMPTY_BLOG_CHAT_PROGRESS_TRACE: BlogChatProgressTrace = {
  stages: [],
  sources: [],
  elapsedMilliseconds: null,
  failed: false,
}

function collectUniqueProgressSources(
  sources: BlogChatProgressSource[],
): BlogChatProgressSource[] {
  return sources.filter((source, sourceIndex) => {
    return (
      sources.findIndex((candidate) => candidate.url === source.url) ===
      sourceIndex
    )
  })
}

export function reduceBlogChatProgressTrace(
  currentTrace: BlogChatProgressTrace,
  event: BlogChatProgressEvent,
): BlogChatProgressTrace {
  if (event.type === 'sources') {
    return {
      ...currentTrace,
      sources: collectUniqueProgressSources(event.sources),
    }
  }

  if (event.type === 'completed') {
    return {
      ...currentTrace,
      stages: currentTrace.stages.map((stageState) => {
        return {
          ...stageState,
          status: 'completed' as const,
        }
      }),
      elapsedMilliseconds: event.elapsedMilliseconds,
      failed: false,
    }
  }

  if (event.type === 'failed') {
    return {
      ...currentTrace,
      stages: currentTrace.stages.map((stageState) => {
        return {
          ...stageState,
          status: 'completed' as const,
        }
      }),
      failed: true,
    }
  }

  const existingStageIndex = currentTrace.stages.findIndex((stageState) => {
    return stageState.stage === event.stage
  })
  const completedStages = currentTrace.stages.map((stageState) => {
    return {
      ...stageState,
      status: 'completed' as const,
    }
  })

  if (existingStageIndex !== -1) {
    return {
      ...currentTrace,
      stages: completedStages.map((stageState, stageIndex) => {
        return stageIndex === existingStageIndex
          ? { ...stageState, status: 'active' as const }
          : stageState
      }),
      failed: false,
    }
  }

  return {
    ...currentTrace,
    stages: [
      ...completedStages,
      {
        stage: event.stage,
        status: 'active',
      },
    ],
    failed: false,
  }
}
