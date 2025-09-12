import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export default getRequestConfig(async () => {
  const store = await cookies()
  const locale = store.get('locale')?.value || 'ko'

  const messagesModule = await import(`../messages/${locale}.json`)
  const messages = messagesModule.default

  return {
    locale,
    messages,
  }
})
