'use client'

import { useEffect, useRef } from 'react'
import type { EngagementEventName } from '@/features/engagement/config/constants'
import { commitEngagementEvent } from '@/features/engagement/api/commit-engagement-event'
import type { SupportedLocale } from '@/shared/config/constants'

interface EngagementPageViewProps {
  eventName: EngagementEventName
  locale: SupportedLocale
  contentSlug?: string
}

interface EngagementPageViewIdentity {
  eventId: string
  eventName: EngagementEventName
  locale: SupportedLocale
  contentSlug?: string
}

export function EngagementPageView({
  eventName,
  locale,
  contentSlug,
}: EngagementPageViewProps) {
  const eventIdentityReference = useRef<EngagementPageViewIdentity | null>(null)

  useEffect(() => {
    const previousEventIdentity = eventIdentityReference.current
    const currentEventIdentity =
      !previousEventIdentity ||
      previousEventIdentity.eventName !== eventName ||
      previousEventIdentity.locale !== locale ||
      previousEventIdentity.contentSlug !== contentSlug
        ? {
            eventId: globalThis.crypto.randomUUID(),
            eventName,
            locale,
            contentSlug,
          }
        : previousEventIdentity

    eventIdentityReference.current = currentEventIdentity

    void commitEngagementEvent({
      eventId: currentEventIdentity.eventId,
      eventName,
      locale,
      contentSlug,
    }).catch(() => null)
  }, [contentSlug, eventName, locale])

  return null
}
