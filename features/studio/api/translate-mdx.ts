import OpenAI from 'openai'
import { type SupportedLocale } from '@/shared/config/constants'

export interface TranslateMdxParams {
  sourceMdx: string
  sourceLocale: SupportedLocale
  targetLocale: SupportedLocale
}

export interface TranslateMdxResult {
  ok: boolean
  mdx?: string
  error?: string
}

// OpenAI를 통해 MDX 전체(Frontmatter + 본문)를 대상 로케일로 번역합니다.
// 주의사항:
// - frontmatter의 구조/키는 유지
// - 번역 대상: title, description, 본문 텍스트
// - 변경 금지: slug, date, tags, section, series, thumbnail, draft, writer, 이미지/코드블록/링크 URL
export async function translateMdxWithOpenAI({
  sourceMdx,
  sourceLocale,
  targetLocale,
}: TranslateMdxParams): Promise<TranslateMdxResult> {
  if (targetLocale === sourceLocale) {
    return { ok: true, mdx: sourceMdx }
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { ok: false, error: 'Missing OPENAI_API_KEY' }
  }

  const client = new OpenAI({ apiKey })

  const system = `You are a professional technical writer translating MDX blog posts.
Requirements:
- Preserve YAML frontmatter keys and structure.
- Translate only values for title and description in frontmatter.
- Do NOT change: slug, date, tags(tag), section, series, thumbnail, draft, writer.
- Translate body text to ${targetLocale}. Keep code blocks and image paths intact.
- Do not wrap or escape markdown unnecessarily.
- Keep overall formatting and headings.
Input locale: ${sourceLocale}. Output locale: ${targetLocale}.`

  const user = `MDX document:
${sourceMdx}`

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MDX_MODEL ?? 'gpt-5-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      // temperature: 0.2,
    })

    const content = response.choices?.[0]?.message?.content
    if (!content) {
      return { ok: false, error: 'No content from OpenAI' }
    }

    return { ok: true, mdx: content }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { ok: false, error: msg }
  }
}
