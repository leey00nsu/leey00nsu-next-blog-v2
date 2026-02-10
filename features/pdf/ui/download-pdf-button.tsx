'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import {
  buildPdfFileName,
  PDF,
  type PdfDocumentKind,
  type SupportedLocale,
} from '@/shared/config/constants'

interface DownloadPdfButtonProps {
  locale: SupportedLocale
  documentKind: PdfDocumentKind
}

const PDF_DOWNLOAD_API_ROUTE_BY_DOCUMENT_KIND = {
  [PDF.DOCUMENT_KIND.RESUME]: PDF.API_ROUTE.RESUME,
  [PDF.DOCUMENT_KIND.PORTFOLIO]: PDF.API_ROUTE.PORTFOLIO,
} as const

const PDF_DOWNLOAD_TRANSLATION_KEY_BY_DOCUMENT_KIND = {
  download: {
    [PDF.DOCUMENT_KIND.RESUME]: 'downloadResume',
    [PDF.DOCUMENT_KIND.PORTFOLIO]: 'downloadPortfolio',
  },
  success: {
    [PDF.DOCUMENT_KIND.RESUME]: 'successResume',
    [PDF.DOCUMENT_KIND.PORTFOLIO]: 'successPortfolio',
  },
  error: {
    [PDF.DOCUMENT_KIND.RESUME]: 'errorResume',
    [PDF.DOCUMENT_KIND.PORTFOLIO]: 'errorPortfolio',
  },
} as const

export function DownloadPdfButton({
  locale,
  documentKind,
}: DownloadPdfButtonProps) {
  const translate = useTranslations('pdf')
  const [isLoading, setIsLoading] = useState(false)

  const handleDownload = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(
        PDF_DOWNLOAD_API_ROUTE_BY_DOCUMENT_KIND[documentKind],
        {
          method: 'GET',
          cache: 'no-store',
          credentials: 'same-origin',
        },
      )

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = globalThis.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = buildPdfFileName(documentKind, locale)
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      globalThis.URL.revokeObjectURL(url)
      toast.success(
        translate(
          PDF_DOWNLOAD_TRANSLATION_KEY_BY_DOCUMENT_KIND.success[documentKind],
        ),
      )
    } catch (error) {
      console.error(error)
      toast.error(
        translate(
          PDF_DOWNLOAD_TRANSLATION_KEY_BY_DOCUMENT_KIND.error[documentKind],
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleDownload} disabled={isLoading} variant="outline">
      {isLoading
        ? translate('loading')
        : translate(
            PDF_DOWNLOAD_TRANSLATION_KEY_BY_DOCUMENT_KIND.download[documentKind],
          )}
    </Button>
  )
}
