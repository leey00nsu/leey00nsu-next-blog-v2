import { PDF_DOWNLOAD } from '@/features/pdf/config/constants'
import {
  PDF,
  type PdfDocumentKind,
  type SupportedLocale,
} from '@/shared/config/constants'

export function buildPdfDownloadFileName(
  documentKind: PdfDocumentKind,
  locale: SupportedLocale,
  downloadDate: Date,
): string {
  const dateParts = new Intl.DateTimeFormat('en', {
    timeZone: PDF_DOWNLOAD.TIME_ZONE,
    year: '2-digit',
    month: '2-digit',
  }).formatToParts(downloadDate)
  const dateValues = Object.fromEntries(
    dateParts.map((part) => [part.type, part.value]),
  )
  const prefix = PDF_DOWNLOAD.FILE_NAME_PREFIX_BY_LOCALE[locale][documentKind]

  return `${prefix}_${dateValues.year}${dateValues.month}.${PDF.FILE_EXTENSION}`
}

export function buildPdfDownloadContentDisposition(
  documentKind: PdfDocumentKind,
  locale: SupportedLocale,
  downloadDate: Date,
): string {
  const fileName = buildPdfDownloadFileName(documentKind, locale, downloadDate)
  const fallbackFileName = buildPdfDownloadFileName(
    documentKind,
    'en',
    downloadDate,
  )

  return `attachment; filename="${fallbackFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
}
