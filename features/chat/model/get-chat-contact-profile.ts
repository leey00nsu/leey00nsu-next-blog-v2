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
  EMAIL_LABEL: 'Email',
  EMAIL_PROTOCOL: 'mailto:',
  SUPPORTED_HREF: /^(?:https?:\/\/|mailto:)/u,
  HTML_PATTERNS: {
    ANCHOR: /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/giu,
    ALT: /alt="([^"]+)"/iu,
    TAG: /<[^>]+>/g,
    WHITESPACE: /\s+/g,
  },
  MARKDOWN_LINK_PATTERN:
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)/giu,
  CONTACT_SECTION_END_PATTERN: /^###\s+/mu,
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

function resolveContactMethodLabel(
  anchorContent: string,
  href: string,
): string {
  const altMatch = anchorContent
    .match(CHAT_CONTACT.HTML_PATTERNS.ALT)?.[1]
    ?.trim()

  if (altMatch) {
    return altMatch
  }

  try {
    const url = new URL(href)

    if (url.protocol === CHAT_CONTACT.EMAIL_PROTOCOL) {
      return CHAT_CONTACT.EMAIL_LABEL
    }

    const normalizedHostName = url.hostname.replace(/^www\./u, '')
    const knownHostLabel =
      CHAT_CONTACT.HOST_LABEL_MAP[
        normalizedHostName as keyof typeof CHAT_CONTACT.HOST_LABEL_MAP
      ]

    if (knownHostLabel) {
      return knownHostLabel
    }
  } catch {
    if (href.startsWith(CHAT_CONTACT.EMAIL_PROTOCOL)) {
      return CHAT_CONTACT.EMAIL_LABEL
    }
  }

  const sanitizedText = sanitizeHtmlText(anchorContent)

  return sanitizedText || href
}

function collectContactMethod(params: {
  contactMethodMap: Map<string, ChatContactMethod>
  href: string
  content: string
}): void {
  if (
    !CHAT_CONTACT.SUPPORTED_HREF.test(params.href) ||
    params.contactMethodMap.has(params.href)
  ) {
    return
  }

  params.contactMethodMap.set(params.href, {
    label: resolveContactMethodLabel(params.content, params.href),
    url: params.href,
  })
}

function extractContactMethodsFromContent(
  content: string,
): ChatContactMethod[] {
  const uniqueContactMethodMap = new Map<string, ChatContactMethod>()
  const contactSectionContent =
    content.split(CHAT_CONTACT.CONTACT_SECTION_END_PATTERN, 1)[0] ?? content

  for (const anchorMatch of contactSectionContent.matchAll(
    CHAT_CONTACT.HTML_PATTERNS.ANCHOR,
  )) {
    const href = anchorMatch[1]?.trim() ?? ''
    const anchorContent = anchorMatch[2] ?? ''

    collectContactMethod({
      contactMethodMap: uniqueContactMethodMap,
      href,
      content: anchorContent,
    })
  }

  for (const linkMatch of contactSectionContent.matchAll(
    CHAT_CONTACT.MARKDOWN_LINK_PATTERN,
  )) {
    collectContactMethod({
      contactMethodMap: uniqueContactMethodMap,
      href: linkMatch[2]?.trim() ?? '',
      content: linkMatch[1] ?? '',
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
