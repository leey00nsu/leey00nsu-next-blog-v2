'use client'

import { Button } from '@/shared/ui/button'
import { Check, Clipboard } from 'lucide-react'
import { HTMLAttributes, useEffect, useRef, useState } from 'react'
import { getFigureCodeText } from '@/features/post/lib/get-figure-code-text'

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
    const figure = (copyButtonRef.current.closest('figure') ||
      copyButtonRef.current.parentNode?.parentNode) as ParentNode | null
    const text = getFigureCodeText(figure)
    if (!text) return
    await navigator.clipboard.writeText(text)
    setIsCopied(true)
  }

  return (
    <figcaption
      className="flex items-center justify-between px-4 py-2"
      {...props}
    >
      <div className="text-amber-50">{children}</div>
      <Button
        ref={copyButtonRef}
        onClick={copyToClipboardHandler}
        size="icon"
        className="size-8 bg-transparent text-amber-50 hover:bg-transparent"
      >
        {isCopied && <Check className="text-green-400" />}
        {!isCopied && <Clipboard />}
      </Button>
    </figcaption>
  )
}
