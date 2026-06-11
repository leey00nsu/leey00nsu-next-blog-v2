import { LoaderCircle, Send } from 'lucide-react'

interface BlogChatSubmitContentProps {
  isSubmitting: boolean
  isUploading: boolean
}

export function BlogChatSubmitContent({
  isSubmitting,
  isUploading,
}: BlogChatSubmitContentProps) {
  if (isSubmitting || isUploading) {
    return <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
  }

  return <Send aria-hidden="true" className="size-5" />
}
