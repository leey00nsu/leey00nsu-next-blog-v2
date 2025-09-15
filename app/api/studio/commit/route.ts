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

    // 요청 로케일: 폼 > 쿠키 > 기본값
    const store = await cookies()
    const supported = new Set(LOCALES.SUPPORTED as readonly string[])
    const sourceFromForm = String(
      form.get(STUDIO.COMMIT_FIELDS.SOURCE_LOCALE) || '',
    ).trim()
    const targetsFromForm = form.getAll(
      STUDIO.COMMIT_FIELDS.TARGET_LOCALES,
    ) as string[]
    const expandedTargets = targetsFromForm.flatMap((t) =>
      String(t)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    )

    const sourceLocale = supported.has(sourceFromForm)
      ? (sourceFromForm as SupportedLocale)
      : ((store.get('locale')?.value || LOCALES.DEFAULT) as SupportedLocale)

    const rawTargets =
      expandedTargets.length > 0
        ? expandedTargets
        : (LOCALES.SUPPORTED as unknown as string[])
    const targetLocales = [
      ...new Set(rawTargets.filter((t) => supported.has(t))),
    ] as SupportedLocale[]
    if (targetLocales.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No valid target locales' },
        { status: 400 },
      )
    }

    // 대상 로케일 전체에 대해 MDX 생성
    const mdxFiles: { locale?: SupportedLocale; content: string }[] = []
    for (const target of targetLocales) {
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
