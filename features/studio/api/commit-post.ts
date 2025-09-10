import { CommitPostResponse } from '@/features/studio/model/types'
import { ROUTES } from '@/shared/config/constants'

export async function commitPost(form: FormData): Promise<CommitPostResponse> {
  const res = await fetch(ROUTES.API.STUDIO_COMMIT, {
    method: 'POST',
    body: form,
  })
  let data: CommitPostResponse | undefined
  try {
    data = (await res.json()) as CommitPostResponse
  } catch {}

  if (!res.ok) {
    return { ok: false, error: data?.error ?? res.statusText }
  }
  return data ?? { ok: false, error: 'Invalid response' }
}
