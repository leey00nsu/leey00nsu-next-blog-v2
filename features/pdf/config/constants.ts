import type {
  PdfDocumentKind,
  SupportedLocale,
} from '@/shared/config/constants'

export const PDF_DOWNLOAD = {
  TIME_ZONE: 'Asia/Seoul',
  FILE_NAME_PREFIX_BY_LOCALE: {
    ko: {
      resume: '이윤수_이력서',
      portfolio: '이윤수_포트폴리오',
    },
    en: {
      resume: 'leeyoonsu_resume',
      portfolio: 'leeyoonsu_portfolio',
    },
  } satisfies Record<SupportedLocale, Record<PdfDocumentKind, string>>,
} as const
