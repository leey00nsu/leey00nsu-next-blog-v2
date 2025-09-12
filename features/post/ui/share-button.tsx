'use client'

import { Button } from '@/shared/ui/button'
import { Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

export function ShareButton() {
  const t = useTranslations('post.share')
  const currentUrl = globalThis.location?.href

  const copyUrlHandler = () => {
    navigator.clipboard.writeText(currentUrl)
    toast.success(t('copied'))
  }

  return (
    <Button size="icon" variant="outline" onClick={copyUrlHandler}>
      <Share2 />
    </Button>
  )
}
