import { z } from 'zod'
import { ENGAGEMENT } from '@/features/engagement/config/constants'
import { LOCALES, PDF } from '@/shared/config/constants'

const ENGAGEMENT_EVENT_VALIDATION = {
  MAXIMUM_PAGE_PATH_LENGTH: 500,
  MAXIMUM_CONTENT_SLUG_LENGTH: 200,
  MAXIMUM_REFERRER_HOST_LENGTH: 255,
  MAXIMUM_CAMPAIGN_VALUE_LENGTH: 100,
} as const

const optionalCampaignValueSchema = z
  .string()
  .trim()
  .min(1)
  .max(ENGAGEMENT_EVENT_VALIDATION.MAXIMUM_CAMPAIGN_VALUE_LENGTH)
  .optional()

export const engagementEventPayloadSchema = z
  .object({
    eventId: z.string().uuid(),
    eventName: z.enum([
      ENGAGEMENT.EVENT_NAME.ABOUT_VIEW,
      ENGAGEMENT.EVENT_NAME.BLOG_LIST_VIEW,
      ENGAGEMENT.EVENT_NAME.BLOG_POST_VIEW,
      ENGAGEMENT.EVENT_NAME.RESUME_DOWNLOAD,
      ENGAGEMENT.EVENT_NAME.PORTFOLIO_DOWNLOAD,
      ENGAGEMENT.EVENT_NAME.CONTACT_CLICK,
    ]),
    locale: z.enum(LOCALES.SUPPORTED),
    pagePath: z
      .string()
      .trim()
      .min(1)
      .max(ENGAGEMENT_EVENT_VALIDATION.MAXIMUM_PAGE_PATH_LENGTH)
      .regex(/^\/[^?#]*$/u),
    contentSlug: z
      .string()
      .trim()
      .min(1)
      .max(ENGAGEMENT_EVENT_VALIDATION.MAXIMUM_CONTENT_SLUG_LENGTH)
      .regex(/^[^/?#]+$/u)
      .optional(),
    documentKind: z
      .enum([PDF.DOCUMENT_KIND.RESUME, PDF.DOCUMENT_KIND.PORTFOLIO])
      .optional(),
    targetKind: z.enum([ENGAGEMENT.TARGET_KIND.EMAIL]).optional(),
    referrerHost: z
      .string()
      .trim()
      .min(1)
      .max(ENGAGEMENT_EVENT_VALIDATION.MAXIMUM_REFERRER_HOST_LENGTH)
      .optional(),
    utmSource: optionalCampaignValueSchema,
    utmMedium: optionalCampaignValueSchema,
    utmCampaign: optionalCampaignValueSchema,
  })
  .superRefine((payload, refinementContext) => {
    const expectedDocumentKindByEventName = {
      [ENGAGEMENT.EVENT_NAME.RESUME_DOWNLOAD]: PDF.DOCUMENT_KIND.RESUME,
      [ENGAGEMENT.EVENT_NAME.PORTFOLIO_DOWNLOAD]: PDF.DOCUMENT_KIND.PORTFOLIO,
    } as const
    const expectedDocumentKind =
      expectedDocumentKindByEventName[
        payload.eventName as keyof typeof expectedDocumentKindByEventName
      ]

    if (expectedDocumentKind && payload.documentKind !== expectedDocumentKind) {
      refinementContext.addIssue({
        code: 'custom',
        path: ['documentKind'],
        message: `documentKind must be ${expectedDocumentKind}.`,
      })
    }

    if (!expectedDocumentKind && payload.documentKind) {
      refinementContext.addIssue({
        code: 'custom',
        path: ['documentKind'],
        message: 'documentKind is only allowed for PDF download events.',
      })
    }

    if (
      payload.eventName === ENGAGEMENT.EVENT_NAME.CONTACT_CLICK &&
      payload.targetKind !== ENGAGEMENT.TARGET_KIND.EMAIL
    ) {
      refinementContext.addIssue({
        code: 'custom',
        path: ['targetKind'],
        message: 'targetKind must be email.',
      })
    }

    if (
      payload.eventName !== ENGAGEMENT.EVENT_NAME.CONTACT_CLICK &&
      payload.targetKind
    ) {
      refinementContext.addIssue({
        code: 'custom',
        path: ['targetKind'],
        message: 'targetKind is only allowed for contact click events.',
      })
    }

    if (
      payload.eventName === ENGAGEMENT.EVENT_NAME.BLOG_POST_VIEW &&
      !payload.contentSlug
    ) {
      refinementContext.addIssue({
        code: 'custom',
        path: ['contentSlug'],
        message: 'contentSlug is required for blog post view events.',
      })
    }

    if (
      payload.eventName !== ENGAGEMENT.EVENT_NAME.BLOG_POST_VIEW &&
      payload.contentSlug
    ) {
      refinementContext.addIssue({
        code: 'custom',
        path: ['contentSlug'],
        message: 'contentSlug is only allowed for blog post view events.',
      })
    }
  })

export type EngagementEventPayload = z.infer<
  typeof engagementEventPayloadSchema
>
