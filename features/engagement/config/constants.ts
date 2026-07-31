export const ENGAGEMENT = {
  EVENT_NAME: {
    ABOUT_VIEW: 'about_view',
    BLOG_LIST_VIEW: 'blog_list_view',
    BLOG_POST_VIEW: 'blog_post_view',
    RESUME_DOWNLOAD: 'resume_download',
    PORTFOLIO_DOWNLOAD: 'portfolio_download',
    CONTACT_CLICK: 'contact_click',
  },
  TARGET_KIND: {
    EMAIL: 'email',
  },
  SORT_DIRECTION: {
    CREATED_AT_ASCENDING: 'created_at_asc',
    CREATED_AT_DESCENDING: 'created_at_desc',
  },
  FILTER: {
    ALL_EVENTS: 'all',
  },
} as const

export type EngagementEventName =
  (typeof ENGAGEMENT.EVENT_NAME)[keyof typeof ENGAGEMENT.EVENT_NAME]

export type EngagementTargetKind =
  (typeof ENGAGEMENT.TARGET_KIND)[keyof typeof ENGAGEMENT.TARGET_KIND]

export type EngagementEventSortDirection =
  (typeof ENGAGEMENT.SORT_DIRECTION)[keyof typeof ENGAGEMENT.SORT_DIRECTION]
