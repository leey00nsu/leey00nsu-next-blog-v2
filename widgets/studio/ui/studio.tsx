'use client'

import dynamic from 'next/dynamic'

const Editor = dynamic(() => import('@/features/editor/ui/editor'), {
  ssr: false,
})

export function Studio() {
  return <Editor value={``} fieldChange={() => {}} />
}
