'use client'

import { Toaster } from 'sonner'

export interface SonnerToasterProps {
  position?:
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right'
}

export function SonnerToaster({ position = 'top-center' }: SonnerToasterProps) {
  return (
    <Toaster
      position={position}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'border shadow-sm',
        },
      }}
    />
  )
}

