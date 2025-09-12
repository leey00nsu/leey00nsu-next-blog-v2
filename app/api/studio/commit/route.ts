import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { commitToGithub } from '@/features/studio/actions/commit-to-github'
import { STUDIO } from '@/features/studio/config/constants'
import { LOCALES, type SupportedLocale } from '@/shared/config/constants'
import { translateMdxWithOpenAI } from '@/features/studio/api/translate-mdx'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const form = await req.formData()

    const slug = String(form.get(STUDIO.COMMIT_FIELDS.SLUG) || '')
    const mdx = String(form.get(STUDIO.COMMIT_FIELDS.MDX) || '')
    if (!slug || !mdx) {
      return NextResponse.json(
        { ok: false, error: 'Missing slug or mdx' },
        { status: 400 },
      )
    }

    const paths = form.getAll(STUDIO.COMMIT_FIELDS.IMAGE_PATHS) as string[]
    const files = form.getAll(STUDIO.COMMIT_FIELDS.IMAGES) as File[]

    if (paths.length !== files.length) {
      return NextResponse.json(
        { ok: false, error: 'paths/images length mismatch' },
        { status: 400 },
      )
    }

    const images = await Promise.all(
      files.map(async (f, i) => {
        const ab = await f.arrayBuffer()
        const data = new Uint8Array(ab)
        const rawPath = paths[i]
        // 선두 슬래시 제거하여 리포지토리 기준 경로로 변환
        const path = rawPath.replace(/^\/+/, '')
        return { path, data }
      }),
    )

    // 요청한 로케일(에디터에서 작성한 로케일) 추정: 쿠키 또는 기본값
    const store = await cookies()
    const sourceLocale = (store.get('locale')?.value ||
      LOCALES.DEFAULT) as SupportedLocale

    // 대상 로케일 전체에 대해 MDX 생성
    const mdxFiles: { locale?: SupportedLocale; content: string }[] = []
    for (const target of LOCALES.SUPPORTED) {
      if (target === sourceLocale) {
        mdxFiles.push({ locale: target, content: mdx })
      } else {
        const res = await translateMdxWithOpenAI({
          sourceMdx: mdx,
          sourceLocale,
          targetLocale: target,
        })
        if (!res.ok || !res.mdx) {
          return NextResponse.json(
            { ok: false, error: res.error ?? 'Translate failed' },
            { status: 500 },
          )
        }
        mdxFiles.push({ locale: target, content: res.mdx })
      }
    }

    const result = await commitToGithub({ slug, mdxFiles, images })
    return NextResponse.json({ ok: true, commitSha: result.commitSha })
  } catch (error) {
    console.error('Commit API error', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
