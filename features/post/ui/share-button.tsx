'use client'

import { Button } from '@/shared/ui/button'
import { Share2 } from 'lucide-react'
import { toast } from 'sonner'

export function ShareButton() {
  const currentUrl = globalThis.location?.href

  const copyUrlHandler = () => {
    navigator.clipboard.writeText(currentUrl)
    toast.success('URL이 복사되었습니다.')
  }

  return (
    <Button size="icon" variant="outline" onClick={copyUrlHandler}>
      <Share2 />
    </Button>
  )
}
