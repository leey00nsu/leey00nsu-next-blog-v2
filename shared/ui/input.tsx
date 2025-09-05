'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none',
          'placeholder:text-muted-foreground',
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }

