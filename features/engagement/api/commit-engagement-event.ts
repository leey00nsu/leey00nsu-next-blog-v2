import {
  ENGAGEMENT,
  type EngagementEventName,
  type EngagementTargetKind,
} from '@/features/engagement/config/constants'
import {
  LOCALES,
  PDF,
  ROUTES,
  type PdfDocumentKind,
  type SupportedLocale,
} from '@/shared/config/constants'

const ENGAGEMENT_EVENT_CLIENT = {
  CAMPAIGN_QUERY_KEY: {
    SOURCE: 'utm_source',
    MEDIUM: 'utm_medium',
    CAMPAIGN: 'utm_campaign',
  },
} as const

let engagementIdentityInitializationPromise: Promise<void> | null = null
let engagementEventCommitQueue: Promise<void> = Promise.resolve()

interface CommitEngagementEventParams {
  eventName: EngagementEventName
  locale?: SupportedLocale
  contentSlug?: string
  documentKind?: PdfDocumentKind
  targetKind?: EngagementTargetKind
  eventId?: string
}

function determineCurrentLocale(): SupportedLocale {
  const documentLocale = document.documentElement.lang

  return LOCALES.SUPPORTED.includes(documentLocale as SupportedLocale)
    ? (documentLocale as SupportedLocale)
    : LOCALES.DEFAULT
}

function getReferrerHost(): string | undefined {
  if (!document.referrer) {
    return undefined
  }

  try {
    return new URL(document.referrer).hostname || undefined
  } catch {
    return undefined
  }
}

function getOptionalSearchParameter(
  searchParameters: URLSearchParams,
  key: string,
): string | undefined {
  return searchParameters.get(key)?.trim() || undefined
}

async function initializeEngagementIdentity(): Promise<void> {
  const response = await fetch(ROUTES.API.ENGAGEMENT_EVENTS, {
    method: 'HEAD',
    cache: 'no-store',
    credentials: 'same-origin',
    keepalive: true,
  })

  if (!response.ok) {
    throw new Error('Failed to initialize engagement identity.')
  }
}

async function ensureEngagementIdentityInitialized(): Promise<void> {
  engagementIdentityInitializationPromise ??= initializeEngagementIdentity()

  try {
    await engagementIdentityInitializationPromise
  } catch (error) {
    engagementIdentityInitializationPromise = null
    throw error
  }
}

async function executeCommitEngagementEvent({
  eventName,
  locale = determineCurrentLocale(),
  contentSlug,
  documentKind,
  targetKind,
  eventId = globalThis.crypto.randomUUID(),
}: CommitEngagementEventParams): Promise<void> {
  await ensureEngagementIdentityInitialized()

  const searchParameters = new URLSearchParams(globalThis.location.search)
  const response = await fetch(ROUTES.API.ENGAGEMENT_EVENTS, {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    keepalive: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      eventId,
      eventName,
      locale,
      pagePath: globalThis.location.pathname,
      contentSlug,
      documentKind,
      targetKind,
      referrerHost: getReferrerHost(),
      utmSource: getOptionalSearchParameter(
        searchParameters,
        ENGAGEMENT_EVENT_CLIENT.CAMPAIGN_QUERY_KEY.SOURCE,
      ),
      utmMedium: getOptionalSearchParameter(
        searchParameters,
        ENGAGEMENT_EVENT_CLIENT.CAMPAIGN_QUERY_KEY.MEDIUM,
      ),
      utmCampaign: getOptionalSearchParameter(
        searchParameters,
        ENGAGEMENT_EVENT_CLIENT.CAMPAIGN_QUERY_KEY.CAMPAIGN,
      ),
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to record engagement event.')
  }
}

export function commitEngagementEvent(
  params: CommitEngagementEventParams,
): Promise<void> {
  const commitPromise = engagementEventCommitQueue
    .catch(() => null)
    .then(() => executeCommitEngagementEvent(params))

  engagementEventCommitQueue = commitPromise

  return commitPromise
}

export function getDownloadEngagementEventName(
  documentKind: PdfDocumentKind,
): EngagementEventName {
  return documentKind === PDF.DOCUMENT_KIND.RESUME
    ? ENGAGEMENT.EVENT_NAME.RESUME_DOWNLOAD
    : ENGAGEMENT.EVENT_NAME.PORTFOLIO_DOWNLOAD
}
