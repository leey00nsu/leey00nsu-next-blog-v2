'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { SupportedLocale } from '@/shared/config/constants'

interface DownloadResumeButtonProps {
  locale: SupportedLocale
}

export function DownloadResumeButton({ locale }: DownloadResumeButtonProps) {
  const t = useTranslations('pdf')
  const [isLoading, setIsLoading] = useState(false)

  const handleDownload = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/pdf/resume', {
        method: 'GET',
        cache: 'no-store',
        credentials: 'same-origin',
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = globalThis.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `portfolio-${locale}.pdf`
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      globalThis.URL.revokeObjectURL(url)
      toast.success(t('success'))
    } catch (error) {
      console.error(error)
      toast.error(t('error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleDownload} disabled={isLoading} variant="outline">
      {isLoading ? t('loading') : t('download')}
    </Button>
  )
}
