'use client'

import { Button } from '@/shared/ui/button'
import { Check, Clipboard } from 'lucide-react'
import { HTMLAttributes, useEffect, useRef, useState } from 'react'

export function CustomFigcaption({
  children,
  ...props
}: HTMLAttributes<HTMLElement>) {
  const [isCopied, setIsCopied] = useState(false)
  const copyButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isCopied) {
      setTimeout(() => {
        setIsCopied(false)
      }, 1000)
    }
  }, [isCopied])

  const copyToClipboardHandler = async () => {
    if (!copyButtonRef.current) return

    const figure = copyButtonRef.current?.parentNode?.parentNode
    const code = figure?.querySelector('code')
    const text = code?.textContent

    if (!text) return

    await navigator.clipboard.writeText(text)
    setIsCopied(true)
  }

  return (
    <figcaption
      className="flex items-center justify-between px-4 py-2"
      {...props}
    >
      <div className="text-muted">{children}</div>
      <Button
        ref={copyButtonRef}
        onClick={copyToClipboardHandler}
        size="icon"
        className="size-8"
      >
        {isCopied && <Check className="text-green-400" />}
        {!isCopied && <Clipboard />}
      </Button>
    </figcaption>
  )
}
