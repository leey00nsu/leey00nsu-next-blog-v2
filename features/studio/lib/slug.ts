export function sanitizeSlug(raw: string): string {
  let v = raw.toLowerCase()
  v = v.replaceAll(/[^a-z0-9-]/g, '') // 허용 외 문자 제거
  v = v.replaceAll(/-+/g, '-') // 연속 하이픈 축약
  return v
}

export function finalizeSlug(raw: string): string {
  let v = sanitizeSlug(raw)
  v = v.replace(/^-+/, '').replace(/-+$/, '') // 앞/뒤 하이픈 제거
  return v
}

