interface BlogChatAssistantLoadingProps {
  children: string
}

export function BlogChatAssistantLoading({
  children,
}: BlogChatAssistantLoadingProps) {
  return <p className="blog-chat-assistant-loading-text">{children}</p>
}
