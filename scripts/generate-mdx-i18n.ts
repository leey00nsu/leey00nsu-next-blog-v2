/*
  기존 MDX 파일들을 대상으로 다국어(.en.mdx 등) 파일을 생성합니다.
  - posts: public/posts/{slug}/{slug}.mdx -> {slug}.{en}.mdx (없을 때)
  - about: public/about/about.mdx -> about.en.mdx (없을 때)
  - ko 기준 원본을 about.ko.mdx / {slug}.ko.mdx로 복제(없을 때)
  - 번역은 OpenAI를 사용하며 OPENAI_API_KEY 필요
*/

import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import dotenv from 'dotenv'
import { LOCALES, PATHS, type SupportedLocale } from '@/shared/config/constants'
// .env.local 자동 로드 (Node 스크립트용)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
import { translateMdxWithOpenAI } from '@/features/studio/api/translate-mdx'

async function ensureFile(pathname: string, content: string) {
  await fsp.mkdir(path.dirname(pathname), { recursive: true })
  await fsp.writeFile(pathname, content, 'utf8')
}

async function fileExists(p: string) {
  try {
    await fsp.access(p)
    return true
  } catch {
    return false
  }
}

async function processPost(
  slug: string,
  sourceLocale: SupportedLocale,
  targetLocales: SupportedLocale[],
) {
  const dir = path.join(process.cwd(), PATHS.FS.PUBLIC_POSTS_DIR, slug)
  const legacy = path.join(dir, `${slug}.mdx`)
  const sourcePath = path.join(dir, `${slug}.${sourceLocale}.mdx`)

  const hasLegacy = await fileExists(legacy)
  const hasSource = await fileExists(sourcePath)

  // 해당 폴더가 비어있으면 스킵
  if (!hasLegacy && !hasSource) return

  // 원본 결정: source 우선, 없으면 legacy를 원본으로 사용
  const basePath = hasSource ? sourcePath : legacy
  const base = await fsp.readFile(basePath, 'utf8')

  // 표준화: source 파일이 없고 legacy만 있으면 source로 복제(호환성 유지)
  if (!hasSource && hasLegacy) {
    await ensureFile(sourcePath, base)
  }

  // 대상 로케일들 생성
  for (const target of targetLocales) {
    const targetPath = path.join(dir, `${slug}.${target}.mdx`)
    const hasTarget = await fileExists(targetPath)
    if (hasTarget) continue

    if (target === sourceLocale) {
      // 동일 로케일이면 복제만
      await ensureFile(targetPath, base)
      console.log(`[ok] copied: ${path.relative(process.cwd(), targetPath)}`)
      continue
    }

    const tr = await translateMdxWithOpenAI({
      sourceMdx: base,
      sourceLocale,
      targetLocale: target,
    })
    if (!tr.ok || !tr.mdx) {
      console.error(`[skip] translate failed: ${slug} (${sourceLocale}→${target}): ${tr.error}`)
      continue
    }
    await ensureFile(targetPath, tr.mdx)
    console.log(`[ok] generated: ${path.relative(process.cwd(), targetPath)}`)
  }
}

async function processAbout(
  sourceLocale: SupportedLocale,
  targetLocales: SupportedLocale[],
) {
  const dir = path.join(process.cwd(), 'public/about')
  const legacy = path.join(dir, 'about.mdx')
  const sourcePath = path.join(dir, `about.${sourceLocale}.mdx`)

  const hasLegacy = await fileExists(legacy)
  const hasSource = await fileExists(sourcePath)

  if (!hasLegacy && !hasSource) return

  const basePath = hasSource ? sourcePath : legacy
  const base = await fsp.readFile(basePath, 'utf8')

  if (!hasSource && hasLegacy) {
    await ensureFile(sourcePath, base)
  }

  for (const target of targetLocales) {
    const targetPath = path.join(dir, `about.${target}.mdx`)
    const hasTarget = await fileExists(targetPath)
    if (hasTarget) continue

    if (target === sourceLocale) {
      await ensureFile(targetPath, base)
      console.log(`[ok] copied: ${path.relative(process.cwd(), targetPath)}`)
      continue
    }

    const tr = await translateMdxWithOpenAI({
      sourceMdx: base,
      sourceLocale,
      targetLocale: target,
    })
    if (!tr.ok || !tr.mdx) {
      console.error(
        `[skip] translate failed: about (${sourceLocale}→${target}): ${tr.error}`,
      )
      continue
    }
    await ensureFile(targetPath, tr.mdx)
    console.log(`[ok] generated: ${path.relative(process.cwd(), targetPath)}`)
  }
}

function parseArgs() {
  const args = process.argv.slice(2)
  // 우선순위: CLI 인자 > 환경변수 > 기본값
  const sourceArg = args.find((a) => a.startsWith('--source='))
  const targetsArg = args.find((a) => a.startsWith('--targets='))

  const envSource = process.env.MDX_I18N_SOURCE
  const envTargets = process.env.MDX_I18N_TARGETS

  const source = (sourceArg?.split('=')[1] || envSource || LOCALES.DEFAULT) as
    | SupportedLocale
    | string
  const targetsRaw =
    targetsArg?.split('=')[1] || envTargets || LOCALES.SUPPORTED.join(',')

  const targets = targetsRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  // 검증: 지원 로케일만 허용
  const supported = new Set(LOCALES.SUPPORTED as readonly string[])
  if (typeof source !== 'string' || !supported.has(source)) {
    throw new Error(
      `Invalid --source=${source}. Supported: ${LOCALES.SUPPORTED.join(', ')}`,
    )
  }
  const targetLocales = targets.map((t) => {
    if (!supported.has(t)) {
      throw new Error(
        `Invalid target '${t}'. Supported: ${LOCALES.SUPPORTED.join(', ')}`,
      )
    }
    return t as SupportedLocale
  })

  return { sourceLocale: source as SupportedLocale, targetLocales }
}

async function main() {
  const { sourceLocale, targetLocales } = parseArgs()
  const postsDir = path.join(process.cwd(), PATHS.FS.PUBLIC_POSTS_DIR)
  if (!fs.existsSync(postsDir)) return

  const entries = fs
    .readdirSync(postsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)

  for (const slug of entries) {
    await processPost(slug, sourceLocale, targetLocales)
  }

  await processAbout(sourceLocale, targetLocales)
}

// CJS 환경에서도 동작하도록 top-level await을 피합니다.
// eslint-disable-next-line unicorn/prefer-top-level-await
void (async () => {
  try {
    await main()
  } catch (error) {
    console.error(error)
  }
})()
