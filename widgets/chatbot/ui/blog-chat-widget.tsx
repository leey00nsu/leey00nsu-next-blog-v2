'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import {
  ArrowUpRight,
  Loader2,
  MessageCircleMore,
  SendHorizontal,
  X,
} from 'lucide-react'
import { BLOG_CHAT } from '@/features/chat/config/constants'
import { useBlogChat } from '@/features/chat/model/use-blog-chat'
import { Button } from '@/shared/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Textarea } from '@/shared/ui/textarea'
import type { SupportedLocale } from '@/shared/config/constants'
import {
  buildBlogChatCitationContainerVariants,
  buildBlogChatCitationItemVariants,
  buildBlogChatConversationItemVariants,
  buildBlogChatPanelVariants,
  buildBlogChatTriggerVariants,
  buildInitialSeenConversationItemIds,
  shouldAnimateBlogChatConversationItem,
} from '@/widgets/chatbot/lib/blog-chat-widget-motion'

const BLOG_CHAT_WIDGET_PATH = {
  VISIBLE_PATH_PATTERN: /^\/(ko|en)\/(blog|about)(\/|$)/,
  BLOG_DETAIL_PATH_PATTERN: /^\/(ko|en)\/blog\/([^/?#]+)$/,
} as const
const MAXIMUM_QUESTION_CHARACTERS =
  BLOG_CHAT.INPUT.MAXIMUM_QUESTION_CHARACTERS
const BLOG_CHAT_WIDGET_STYLE = {
  SUBMIT_BUTTON_MIN_WIDTH_CLASS_NAME: 'min-w-24',
} as const

function resolveCurrentPostSlug(pathname: string): string | undefined {
  const matchedPath = pathname.match(BLOG_CHAT_WIDGET_PATH.BLOG_DETAIL_PATH_PATTERN)

  return matchedPath?.[2]
}

export function BlogChatWidget() {
  const locale = useLocale() as SupportedLocale
  const pathname = usePathname()
  const t = useTranslations('chatbot')
  const currentPostSlug = resolveCurrentPostSlug(pathname)
  const {
    conversationItems,
    isLoading,
    question,
    setQuestion,
    submitQuestion,
  } = useBlogChat({ locale, currentPostSlug })
  const [isOpen, setIsOpen] = useState(false)
  const [seenConversationItemIds, setSeenConversationItemIds] = useState(() =>
    buildInitialSeenConversationItemIds(conversationItems),
  )
  const [animatedConversationItemIds, setAnimatedConversationItemIds] =
    useState<Set<string>>(() => new Set())
  const shouldReduceMotion = Boolean(useReducedMotion())

  const isVisible = BLOG_CHAT_WIDGET_PATH.VISIBLE_PATH_PATTERN.test(pathname)
  const triggerVariants = buildBlogChatTriggerVariants(shouldReduceMotion)
  const panelVariants = buildBlogChatPanelVariants(shouldReduceMotion)
  const conversationItemVariants =
    buildBlogChatConversationItemVariants(shouldReduceMotion)
  const citationContainerVariants =
    buildBlogChatCitationContainerVariants(shouldReduceMotion)
  const citationItemVariants =
    buildBlogChatCitationItemVariants(shouldReduceMotion)
  const refusalMessages = {
    insufficient_search_match: t('refusal.insufficient_search_match'),
    insufficient_evidence: t('refusal.insufficient_evidence'),
    invalid_citations: t('refusal.invalid_citations'),
    missing_api_key: t('refusal.missing_api_key'),
    model_error: t('refusal.model_error'),
    question_too_long: t('refusal.question_too_long'),
    daily_limit_exceeded: t('refusal.daily_limit_exceeded'),
  } as const
  const sourceCategoryLabels = {
    blog: t('sourcesCategory.blog'),
    profile: t('sourcesCategory.profile'),
    project: t('sourcesCategory.project'),
    assistant: t('sourcesCategory.assistant'),
  } as const

  useEffect(() => {
    const nextAnimatedConversationItemIds = conversationItems
      .filter((conversationItem) =>
        shouldAnimateBlogChatConversationItem({
          seenConversationItemIds,
          conversationItemId: conversationItem.id,
        }),
      )
      .map((conversationItem) => conversationItem.id)

    if (nextAnimatedConversationItemIds.length === 0) {
      return
    }

    setSeenConversationItemIds((previousSeenConversationItemIds) => {
      const nextSeenConversationItemIds = new Set(previousSeenConversationItemIds)

      for (const conversationItemId of nextAnimatedConversationItemIds) {
        nextSeenConversationItemIds.add(conversationItemId)
      }

      return nextSeenConversationItemIds
    })

    setAnimatedConversationItemIds((previousAnimatedConversationItemIds) => {
      const nextAnimatedConversationItemIdsSet = new Set(
        previousAnimatedConversationItemIds,
      )

      for (const conversationItemId of nextAnimatedConversationItemIds) {
        nextAnimatedConversationItemIdsSet.add(conversationItemId)
      }

      return nextAnimatedConversationItemIdsSet
    })
  }, [conversationItems, seenConversationItemIds])

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed right-4 bottom-4 z-[60] flex flex-col items-end gap-3 md:right-6 md:bottom-6">
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            key="blog-chat-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="origin-bottom-right"
          >
            <Card className="w-[min(24rem,calc(100vw-2rem))] border-border/80 bg-background/95 shadow-xl backdrop-blur">
              <CardHeader className="gap-3 border-b">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle>{t('title')}</CardTitle>
                    <CardDescription>{t('subtitle')}</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('close')}
                    onClick={() => setIsOpen(false)}
                  >
                    <X />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex max-h-96 flex-col gap-4 overflow-y-auto py-4">
                {conversationItems.length === 0 ? (
                  <div className="bg-muted/60 rounded-xl border px-4 py-3 text-sm">
                    <p className="font-medium">{t('emptyTitle')}</p>
                    <p className="text-muted-foreground mt-1">
                      {t('emptyDescription')}
                    </p>
                  </div>
                ) : null}

                {conversationItems.map((conversationItem) => {
                  const shouldAnimateConversationItem =
                    shouldAnimateBlogChatConversationItem({
                      seenConversationItemIds,
                      conversationItemId: conversationItem.id,
                    }) || animatedConversationItemIds.has(conversationItem.id)

                  const conversationItemContent = (
                    <>
                      <div className="ml-8 rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground">
                        <p className="mb-1 text-xs opacity-80">{t('you')}</p>
                        <p>{conversationItem.question}</p>
                      </div>

                      <div className="mr-8 rounded-2xl border bg-card px-4 py-3 text-sm">
                        <p className="text-muted-foreground mb-2 text-xs">
                          {t('assistant')}
                        </p>
                        {conversationItem.status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="size-4 animate-spin" />
                            <span>{t('sending')}</span>
                          </div>
                        ) : null}

                        {conversationItem.status === 'failed' ? (
                          <p className="whitespace-pre-wrap leading-6 text-destructive">
                            {t(`errors.${conversationItem.errorCode}`)}
                          </p>
                        ) : null}

                        {conversationItem.status === 'completed' ? (
                          <p className="whitespace-pre-wrap leading-6">
                            {!conversationItem.response.grounded &&
                            conversationItem.response.refusalReason
                              ? refusalMessages[
                                  conversationItem.response.refusalReason
                                ]
                              : conversationItem.response.answer}
                          </p>
                        ) : null}

                        {conversationItem.status === 'completed' &&
                        conversationItem.response.citations.length > 0 ? (
                          shouldAnimateConversationItem ? (
                            <motion.div
                              className="mt-3 flex flex-col gap-2 border-t pt-3"
                              variants={citationContainerVariants}
                              initial="hidden"
                              animate="visible"
                            >
                              <p className="text-muted-foreground text-xs">
                                {t('sources')}
                              </p>
                              {conversationItem.response.citations.map((citation) => (
                                <motion.a
                                  key={citation.url}
                                  href={citation.url}
                                  className="hover:bg-muted/70 flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors"
                                  variants={citationItemVariants}
                                >
                                  <span className="flex min-w-0 flex-col">
                                    <span className="truncate font-medium">
                                      {citation.title}
                                    </span>
                                    <span className="text-muted-foreground flex items-center gap-2 truncate text-xs">
                                      <span className="rounded-full border px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                                        {
                                          sourceCategoryLabels[
                                            citation.sourceCategory
                                          ]
                                        }
                                      </span>
                                      <span className="truncate">
                                        {citation.sectionTitle ?? citation.url}
                                      </span>
                                    </span>
                                  </span>
                                  <ArrowUpRight className="size-4 shrink-0" />
                                </motion.a>
                              ))}
                            </motion.div>
                          ) : (
                            <div className="mt-3 flex flex-col gap-2 border-t pt-3">
                              <p className="text-muted-foreground text-xs">
                                {t('sources')}
                              </p>
                              {conversationItem.response.citations.map((citation) => (
                                <a
                                  key={citation.url}
                                  href={citation.url}
                                  className="hover:bg-muted/70 flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors"
                                >
                                  <span className="flex min-w-0 flex-col">
                                    <span className="truncate font-medium">
                                      {citation.title}
                                    </span>
                                    <span className="text-muted-foreground flex items-center gap-2 truncate text-xs">
                                      <span className="rounded-full border px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                                        {
                                          sourceCategoryLabels[
                                            citation.sourceCategory
                                          ]
                                        }
                                      </span>
                                      <span className="truncate">
                                        {citation.sectionTitle ?? citation.url}
                                      </span>
                                    </span>
                                  </span>
                                  <ArrowUpRight className="size-4 shrink-0" />
                                </a>
                              ))}
                            </div>
                          )
                        ) : null}
                      </div>
                    </>
                  )

                  if (!shouldAnimateConversationItem) {
                    return (
                      <div key={conversationItem.id} className="flex flex-col gap-3">
                        {conversationItemContent}
                      </div>
                    )
                  }

                  return (
                    <motion.div
                      key={conversationItem.id}
                      className="flex flex-col gap-3"
                      variants={conversationItemVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {conversationItemContent}
                    </motion.div>
                  )
                })}
              </CardContent>
              <CardFooter className="flex flex-col items-stretch gap-3 border-t pt-4">
                <form
                  className="flex flex-col gap-3"
                  onSubmit={async (event) => {
                    event.preventDefault()
                    await submitQuestion()
                  }}
                >
                  <label className="sr-only" htmlFor="blog-chat-question">
                    {t('inputLabel')}
                  </label>
                  <Textarea
                    id="blog-chat-question"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder={t('inputPlaceholder')}
                    className="min-h-24 resize-none"
                    maxLength={MAXIMUM_QUESTION_CHARACTERS}
                    onKeyDown={async (event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        await submitQuestion()
                      }
                    }}
                  />
                  <p className="text-muted-foreground text-right text-xs">
                    {t('inputCounter', {
                      current: question.length,
                      max: MAXIMUM_QUESTION_CHARACTERS,
                    })}
                  </p>
                  <Button
                    aria-label={isLoading ? t('sending') : t('send')}
                    className={
                      BLOG_CHAT_WIDGET_STYLE.SUBMIT_BUTTON_MIN_WIDTH_CLASS_NAME
                    }
                    disabled={isLoading || !question.trim()}
                    type="submit"
                  >
                    {isLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <SendHorizontal />
                        {t('send')}
                      </>
                    )}
                  </Button>
                </form>
              </CardFooter>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div variants={triggerVariants} initial="hidden" animate="visible">
        <Button
          type="button"
          size="lg"
          className="rounded-full px-5 shadow-lg"
          aria-label={isOpen ? t('close') : t('open')}
          onClick={() => setIsOpen((previousOpenState) => !previousOpenState)}
        >
          <MessageCircleMore />
          {t('trigger')}
        </Button>
      </motion.div>
    </div>
  )
}
