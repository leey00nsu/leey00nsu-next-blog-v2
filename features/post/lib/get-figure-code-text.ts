export function getFigureCodeText(root: ParentNode | Element | null): string | null {
  const el = root as Element | null
  if (!el) return null
  const code = el.querySelector('code')
  let text = code?.textContent ?? null
  // Fallback: support CodeMirror editor (no <code> tag)
  if (!text) {
    const cm = el.querySelector('.cm-content')
    text = cm?.textContent ?? null
  }
  return text
}

