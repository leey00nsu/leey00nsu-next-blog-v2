import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import {
  buildPostMdxRelativePathLocalized,
  LOCALES,
  type SupportedLocale,
} from '@/shared/config/constants'
import { STUDIO } from '@/features/studio/config/constants'
import { translateMdxWithOpenAI } from '@/features/studio/api/translate-mdx'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  // 개발 환경에서만 허용
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { ok: false, error: 'Local save is only available in development mode' },
      { status: 403 },
    )
  }

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

    const imagePaths = form.getAll(STUDIO.COMMIT_FIELDS.IMAGE_PATHS) as string[]
    const files = form.getAll(STUDIO.COMMIT_FIELDS.IMAGES) as File[]

    if (imagePaths.length !== files.length) {
      return NextResponse.json(
        { ok: false, error: 'paths/images length mismatch' },
        { status: 400 },
      )
    }

    // 로케일 처리
    const sourceLocale = String(
      form.get(STUDIO.COMMIT_FIELDS.SOURCE_LOCALE) || 'ko',
    ).trim() as SupportedLocale

    // 번역 옵션 처리
    const enableTranslation = form.get('enableTranslation') === 'true'
    const targetLocalesRaw = form.getAll(
      STUDIO.COMMIT_FIELDS.TARGET_LOCALES,
    ) as string[]
    const targetLocales =
      targetLocalesRaw.length > 0
        ? (targetLocalesRaw.filter((l) =>
            LOCALES.SUPPORTED.includes(l as SupportedLocale),
          ) as SupportedLocale[])
        : (LOCALES.SUPPORTED.filter(
            (l) => l !== sourceLocale,
          ) as SupportedLocale[])

    // MDX 파일 저장 (소스 로케일)
    const mdxPath = buildPostMdxRelativePathLocalized(slug, sourceLocale)
    const mdxFullPath = path.join(process.cwd(), mdxPath)
    const mdxDir = path.dirname(mdxFullPath)

    await mkdir(mdxDir, { recursive: true })
    await writeFile(mdxFullPath, mdx, 'utf8')

    // 번역이 활성화된 경우 다른 로케일로 번역하여 저장
    if (enableTranslation && targetLocales.length > 0) {
      for (const targetLocale of targetLocales) {
        if (targetLocale === sourceLocale) continue

        const translateResult = await translateMdxWithOpenAI({
          sourceMdx: mdx,
          sourceLocale,
          targetLocale,
        })

        if (translateResult.ok && translateResult.mdx) {
          const translatedPath = buildPostMdxRelativePathLocalized(
            slug,
            targetLocale,
          )
          const translatedFullPath = path.join(process.cwd(), translatedPath)
          await writeFile(translatedFullPath, translateResult.mdx, 'utf8')
        } else {
          console.warn(
            `Translation to ${targetLocale} failed:`,
            translateResult.error,
          )
        }
      }
    }

    // 이미지 파일 저장
    for (const [i, file] of files.entries()) {
      const imagePath = imagePaths[i].replace(/^\/+/, '') // 선두 슬래시 제거
      const imageFullPath = path.join(process.cwd(), imagePath)
      const imageDir = path.dirname(imageFullPath)

      await mkdir(imageDir, { recursive: true })

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      await writeFile(imageFullPath, buffer)
    }

    return NextResponse.json({ ok: true, savedPath: mdxPath })
  } catch (error) {
    console.error('Local save error', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
