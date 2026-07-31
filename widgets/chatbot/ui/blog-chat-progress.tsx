import {
  CheckCircle2,
  ChevronDown,
  ListChecks,
  LoaderCircle,
} from 'lucide-react'
import type {
  BlogChatProgressStage,
  BlogChatProgressTrace,
} from '@/features/chat/model/blog-chat-progress'
import type { SupportedLocale } from '@/shared/config/constants'

export interface BlogChatProgressMessages {
  title: string
  completedTitle: string
  sourceCount: (count: number) => string
  stages: Record<BlogChatProgressStage, string>
}

interface BlogChatProgressProps {
  locale: SupportedLocale
  trace: BlogChatProgressTrace
  messages: BlogChatProgressMessages
  pending: boolean
}

const BLOG_CHAT_PROGRESS_TIME = {
  MILLISECONDS_PER_SECOND: 1000,
  MAXIMUM_FRACTION_DIGITS: 1,
} as const

function formatElapsedTime(
  elapsedMilliseconds: number,
  locale: SupportedLocale,
): string {
  const elapsedSeconds =
    elapsedMilliseconds / BLOG_CHAT_PROGRESS_TIME.MILLISECONDS_PER_SECOND

  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits:
      BLOG_CHAT_PROGRESS_TIME.MAXIMUM_FRACTION_DIGITS,
  }).format(elapsedSeconds)}s`
}

function renderBlogChatProgressContent({
  trace,
  messages,
}: Pick<BlogChatProgressProps, 'trace' | 'messages'>) {
  return (
    <div className="mt-3 flex flex-col gap-2.5">
      <ol className="flex flex-col gap-2">
        {trace.stages.map((stageState) => (
          <li
            key={stageState.stage}
            className="text-muted-foreground flex items-start gap-2 text-xs leading-5"
          >
            {stageState.status === 'completed' ? (
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
              />
            ) : (
              <LoaderCircle
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 animate-spin text-foreground"
              />
            )}
            <span
              className={
                stageState.status === 'active'
                  ? 'text-foreground'
                  : undefined
              }
            >
              {messages.stages[stageState.stage]}
            </span>
          </li>
        ))}
      </ol>

      {trace.sources.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pl-6">
          {trace.sources.map((source) => (
            <span
              key={source.url}
              className="bg-muted text-muted-foreground max-w-full truncate rounded-full px-2 py-1 text-[11px]"
              title={
                source.sectionTitle
                  ? `${source.title} · ${source.sectionTitle}`
                  : source.title
              }
            >
              {source.sectionTitle
                ? `${source.title} · ${source.sectionTitle}`
                : source.title}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function BlogChatProgress({
  locale,
  trace,
  messages,
  pending,
}: BlogChatProgressProps) {
  if (pending) {
    return (
      <section
        aria-label={messages.title}
        aria-live="polite"
        className="min-w-0 py-0.5"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <ListChecks aria-hidden="true" className="size-4" />
          <span>{messages.title}</span>
        </div>
        {renderBlogChatProgressContent({ trace, messages })}
      </section>
    )
  }

  if (trace.stages.length === 0 || trace.failed) {
    return null
  }

  const summaryParts = [messages.completedTitle]

  if (trace.sources.length > 0) {
    summaryParts.push(messages.sourceCount(trace.sources.length))
  }

  if (trace.elapsedMilliseconds !== null) {
    summaryParts.push(formatElapsedTime(trace.elapsedMilliseconds, locale))
  }

  return (
    <details className="group">
      <summary className="text-muted-foreground flex cursor-pointer list-none items-center gap-2 text-xs">
        <CheckCircle2
          aria-hidden="true"
          className="size-4 text-emerald-600 dark:text-emerald-400"
        />
        <span>{summaryParts.join(' · ')}</span>
        <ChevronDown
          aria-hidden="true"
          className="ml-auto size-4 transition-transform group-open:rotate-180"
        />
      </summary>
      {renderBlogChatProgressContent({ trace, messages })}
    </details>
  )
}
