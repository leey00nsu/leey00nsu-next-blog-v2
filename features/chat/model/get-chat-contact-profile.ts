import { cache } from 'react'
import { getAbout } from '@/entities/about/lib/about'
import type {
  ChatContactMethod,
  ChatContactProfile,
} from '@/features/chat/model/chat-contact'
import {
  buildLocalizedRoutePath,
  ROUTES,
  type SupportedLocale,
} from '@/shared/config/constants'

const CHAT_CONTACT = {
  MAXIMUM_METHOD_COUNT: 4,
  URL_PROTOCOL: /^https?:\/\//u,
  HTML_PATTERNS: {
    ANCHOR: /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/giu,
    ALT: /alt="([^"]+)"/iu,
    TAG: /<[^>]+>/g,
    WHITESPACE: /\s+/g,
  },
  HOST_LABEL_MAP: {
    'github.com': 'GitHub',
    'linkedin.com': 'LinkedIn',
  } as const,
} as const

function sanitizeHtmlText(text: string): string {
  return text
    .replaceAll(CHAT_CONTACT.HTML_PATTERNS.TAG, ' ')
    .replaceAll(CHAT_CONTACT.HTML_PATTERNS.WHITESPACE, ' ')
    .trim()
}

function resolveContactMethodLabel(anchorContent: string, href: string): string {
  const altMatch = anchorContent.match(CHAT_CONTACT.HTML_PATTERNS.ALT)?.[1]?.trim()

  if (altMatch) {
    return altMatch
  }

  const sanitizedText = sanitizeHtmlText(anchorContent)

  if (sanitizedText) {
    return sanitizedText
  }

  try {
    const url = new URL(href)
    const normalizedHostName = url.hostname.replace(/^www\./u, '')

    return (
      CHAT_CONTACT.HOST_LABEL_MAP[
        normalizedHostName as keyof typeof CHAT_CONTACT.HOST_LABEL_MAP
      ] ?? normalizedHostName
    )
  } catch {
    return href
  }
}

function extractContactMethodsFromContent(content: string): ChatContactMethod[] {
  const uniqueContactMethodMap = new Map<string, ChatContactMethod>()

  for (const anchorMatch of content.matchAll(CHAT_CONTACT.HTML_PATTERNS.ANCHOR)) {
    const href = anchorMatch[1]?.trim() ?? ''
    const anchorContent = anchorMatch[2] ?? ''

    if (!CHAT_CONTACT.URL_PROTOCOL.test(href)) {
      continue
    }

    if (uniqueContactMethodMap.has(href)) {
      continue
    }

    uniqueContactMethodMap.set(href, {
      label: resolveContactMethodLabel(anchorContent, href),
      url: href,
    })
  }

  return [...uniqueContactMethodMap.values()].slice(
    0,
    CHAT_CONTACT.MAXIMUM_METHOD_COUNT,
  )
}

export const getChatContactProfile = cache(
  (locale: SupportedLocale): ChatContactProfile | null => {
    const about = getAbout(locale)

    if (!about) {
      return null
    }

    const methods = extractContactMethodsFromContent(about.content)

    if (methods.length === 0) {
      return null
    }

    return {
      title: about.title,
      aboutUrl: buildLocalizedRoutePath(ROUTES.ABOUT, locale),
      methods,
    }
  },
)
