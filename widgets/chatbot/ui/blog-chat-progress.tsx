'use client'

import { useId, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  CheckCircle2,
  ChevronDown,
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

const BLOG_CHAT_PROGRESS_MOTION = {
  DURATION_SECONDS: 0.24,
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
  withTopMargin = true,
}: Pick<BlogChatProgressProps, 'trace' | 'messages'> & {
  withTopMargin?: boolean
}) {
  return (
    <div
      className={`${withTopMargin ? 'mt-3' : ''} flex flex-col gap-2.5`}
    >
      <ol className="flex flex-col gap-2">
        {trace.stages.map((stageState) => (
          <li
            key={stageState.stage}
            className="text-muted-foreground flex items-start gap-2 text-xs leading-5"
          >
            {stageState.status === 'completed' ? (
              <CheckCircle2
                aria-hidden="true"
                className="text-muted-foreground mt-0.5 size-4 shrink-0"
              />
            ) : (
              <LoaderCircle
                aria-hidden="true"
                className="text-muted-foreground mt-0.5 size-4 shrink-0 animate-spin"
              />
            )}
            <span
              className={
                stageState.status === 'active'
                  ? 'blog-chat-progress-active-text'
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
  const [isExpanded, setIsExpanded] = useState(false)
  const shouldReduceMotion = Boolean(useReducedMotion())
  const contentId = useId()

  if (pending) {
    return (
      <section
        aria-label={messages.title}
        aria-live="polite"
        className="min-w-0 py-0.5"
      >
        {renderBlogChatProgressContent({
          trace,
          messages,
          withTopMargin: false,
        })}
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
    <div>
      <button
        type="button"
        aria-controls={contentId}
        aria-expanded={isExpanded}
        className="text-muted-foreground flex w-full items-center gap-2 text-left text-xs"
        onClick={() => setIsExpanded((currentExpanded) => !currentExpanded)}
      >
        <CheckCircle2
          aria-hidden="true"
          className="text-muted-foreground size-4"
        />
        <span>{summaryParts.join(' · ')}</span>
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{
            duration: shouldReduceMotion
              ? 0
              : BLOG_CHAT_PROGRESS_MOTION.DURATION_SECONDS,
          }}
          className="ml-auto"
        >
          <ChevronDown
            aria-hidden="true"
            className="size-4"
          />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            key="progress-content"
            id={contentId}
            initial={
              shouldReduceMotion
                ? false
                : {
                    height: 0,
                    opacity: 0,
                  }
            }
            animate={{
              height: 'auto',
              opacity: 1,
            }}
            exit={
              {
                height: 0,
                opacity: 0,
              }
            }
            transition={{
              duration: shouldReduceMotion
                ? 0
                : BLOG_CHAT_PROGRESS_MOTION.DURATION_SECONDS,
            }}
            className="overflow-hidden"
          >
            {renderBlogChatProgressContent({ trace, messages })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
