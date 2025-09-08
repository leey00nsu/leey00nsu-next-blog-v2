export function getTitleFromMeta(meta: string): string {
  const m = meta?.match(/(?:^|\s)title=\"([^\"]*)\"/)
  return m?.[1] ?? ''
}

export function setTitleInMeta(meta: string, title: string): string {
  const hasTitle = /(?:^|\s)title=\"([^\"]*)\"/.test(meta)
  if (hasTitle) {
    return meta.replace(/(?:^|\s)title=\"([^\"]*)\"/, (m) =>
      m.replace(/title=\"([^\"]*)\"/, `title="${title}"`),
    )
  }
  const trimmed = meta?.trim()
  const prefix = trimmed ? trimmed + ' ' : ''
  return `${prefix}title="${title}"`
}

