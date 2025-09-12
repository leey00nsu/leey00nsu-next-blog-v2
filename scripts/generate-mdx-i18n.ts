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
import { PATHS } from '@/shared/config/constants'
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

async function processPost(slug: string) {
  const dir = path.join(process.cwd(), PATHS.FS.PUBLIC_POSTS_DIR, slug)
  const legacy = path.join(dir, `${slug}.mdx`)
  const ko = path.join(dir, `${slug}.ko.mdx`)
  const en = path.join(dir, `${slug}.en.mdx`)

  const hasLegacy = await fileExists(legacy)
  const hasKo = await fileExists(ko)
  const hasEn = await fileExists(en)

  if (!hasLegacy && !hasKo && !hasEn) return

  // 원본(ko) 결정
  const basePath = hasKo ? ko : hasLegacy ? legacy : ko
  const base = await fsp.readFile(basePath, 'utf8')

  // ko 파일 표준화: ko.mdx 없으면 legacy 복제
  if (!hasKo && hasLegacy) {
    await ensureFile(ko, base)
    // 기존 legacy는 보존 (호환성)
  }

  // en 생성
  if (!hasEn) {
    const tr = await translateMdxWithOpenAI({
      sourceMdx: base,
      sourceLocale: 'ko',
      targetLocale: 'en',
    })
    if (!tr.ok || !tr.mdx) {
      console.error(`[skip] translate failed: ${slug}: ${tr.error}`)
    } else {
      await ensureFile(en, tr.mdx)
      console.log(`[ok] generated: ${path.relative(process.cwd(), en)}`)
    }
  }
}

async function processAbout() {
  const dir = path.join(process.cwd(), 'public/about')
  const legacy = path.join(dir, 'about.mdx')
  const ko = path.join(dir, 'about.ko.mdx')
  const en = path.join(dir, 'about.en.mdx')

  const hasLegacy = await fileExists(legacy)
  const hasKo = await fileExists(ko)
  const hasEn = await fileExists(en)

  if (!hasLegacy && !hasKo && !hasEn) return

  const basePath = hasKo ? ko : hasLegacy ? legacy : ko
  const base = await fsp.readFile(basePath, 'utf8')

  if (!hasKo && hasLegacy) {
    await ensureFile(ko, base)
  }

  if (!hasEn) {
    const tr = await translateMdxWithOpenAI({
      sourceMdx: base,
      sourceLocale: 'ko',
      targetLocale: 'en',
    })
    if (!tr.ok || !tr.mdx) {
      console.error(`[skip] translate failed: about: ${tr.error}`)
    } else {
      await ensureFile(en, tr.mdx)
      console.log(`[ok] generated: ${path.relative(process.cwd(), en)}`)
    }
  }
}

async function main() {
  const postsDir = path.join(process.cwd(), PATHS.FS.PUBLIC_POSTS_DIR)
  if (!fs.existsSync(postsDir)) return

  const entries = fs
    .readdirSync(postsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)

  for (const slug of entries) {
    await processPost(slug)
  }

  await processAbout()
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
