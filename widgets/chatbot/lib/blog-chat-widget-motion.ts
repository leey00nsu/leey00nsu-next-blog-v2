import type { Variants } from 'motion/react'
import { BLOG_CHAT_WIDGET_MOTION } from '@/widgets/chatbot/config/constants'

interface BlogChatConversationIdentifier {
  id: string
}

interface BlogChatConversationAnimationParams {
  seenConversationItemIds: ReadonlySet<string>
  conversationItemId: string
}

export function buildInitialSeenConversationItemIds(
  conversationItems: ReadonlyArray<BlogChatConversationIdentifier>,
): Set<string> {
  return new Set(conversationItems.map((conversationItem) => conversationItem.id))
}

export function shouldAnimateBlogChatConversationItem({
  seenConversationItemIds,
  conversationItemId,
}: BlogChatConversationAnimationParams): boolean {
  return !seenConversationItemIds.has(conversationItemId)
}

export function buildBlogChatTriggerVariants(
  shouldReduceMotion: boolean,
): Variants {
  if (shouldReduceMotion) {
    return {
      hidden: {
        opacity: 1,
        y: 0,
        scale: 1,
      },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
      },
    }
  }

  return {
    hidden: {
      opacity: 0,
      y: BLOG_CHAT_WIDGET_MOTION.TRIGGER_ENTER_OFFSET_Y,
      scale: BLOG_CHAT_WIDGET_MOTION.TRIGGER_INITIAL_SCALE,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: BLOG_CHAT_WIDGET_MOTION.TRIGGER_ENTER_DURATION_SECONDS,
        ease: BLOG_CHAT_WIDGET_MOTION.EASE,
      },
    },
  }
}

export function buildBlogChatPanelVariants(
  shouldReduceMotion: boolean,
): Variants {
  if (shouldReduceMotion) {
    return {
      hidden: {
        opacity: 1,
        y: 0,
        scale: 1,
      },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
      },
      exit: {
        opacity: 1,
        y: 0,
        scale: 1,
      },
    }
  }

  return {
    hidden: {
      opacity: 0,
      y: BLOG_CHAT_WIDGET_MOTION.PANEL_ENTER_OFFSET_Y,
      scale: BLOG_CHAT_WIDGET_MOTION.PANEL_INITIAL_SCALE,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: BLOG_CHAT_WIDGET_MOTION.PANEL_ENTER_DURATION_SECONDS,
        ease: BLOG_CHAT_WIDGET_MOTION.EASE,
      },
    },
    exit: {
      opacity: 0,
      y: BLOG_CHAT_WIDGET_MOTION.PANEL_EXIT_OFFSET_Y,
      scale: BLOG_CHAT_WIDGET_MOTION.PANEL_INITIAL_SCALE,
      transition: {
        duration: BLOG_CHAT_WIDGET_MOTION.PANEL_EXIT_DURATION_SECONDS,
      },
    },
  }
}

export function buildBlogChatConversationItemVariants(
  shouldReduceMotion: boolean,
): Variants {
  if (shouldReduceMotion) {
    return {
      hidden: {
        opacity: 1,
        y: 0,
      },
      visible: {
        opacity: 1,
        y: 0,
      },
    }
  }

  return {
    hidden: {
      opacity: 0,
      y: BLOG_CHAT_WIDGET_MOTION.MESSAGE_ENTER_OFFSET_Y,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: BLOG_CHAT_WIDGET_MOTION.MESSAGE_ENTER_DURATION_SECONDS,
        ease: BLOG_CHAT_WIDGET_MOTION.EASE,
      },
    },
  }
}

export function buildBlogChatCitationContainerVariants(
  shouldReduceMotion: boolean,
): Variants {
  if (shouldReduceMotion) {
    return {
      hidden: {
        opacity: 1,
      },
      visible: {
        opacity: 1,
      },
    }
  }

  return {
    hidden: {
      opacity: 1,
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: BLOG_CHAT_WIDGET_MOTION.CITATION_STAGGER_DELAY_SECONDS,
      },
    },
  }
}

export function buildBlogChatCitationItemVariants(
  shouldReduceMotion: boolean,
): Variants {
  if (shouldReduceMotion) {
    return {
      hidden: {
        opacity: 1,
        y: 0,
      },
      visible: {
        opacity: 1,
        y: 0,
      },
    }
  }

  return {
    hidden: {
      opacity: 0,
      y: BLOG_CHAT_WIDGET_MOTION.CITATION_ENTER_OFFSET_Y,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: BLOG_CHAT_WIDGET_MOTION.CITATION_ENTER_DURATION_SECONDS,
        ease: BLOG_CHAT_WIDGET_MOTION.EASE,
      },
    },
  }
}
