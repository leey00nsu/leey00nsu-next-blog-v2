import fs from 'node:fs/promises'
import fssync from 'node:fs'
import path from 'node:path'
import lqipModern from 'lqip-modern'
import sharp from 'sharp'
import { PATHS } from '@/shared/config/constants'
import {
  ThumbnailMetadata,
  ThumbnailMetadataMap,
} from '@/entities/post/model/types'

const OUTPUT_PATH = path.join(
  process.cwd(),
  'entities/post/config/thumbnail-metadata.generated.ts',
)

const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.svg',
])

async function ensureDirExists(filePath: string): Promise<void> {
  const dir = path.dirname(filePath)
  if (!fssync.existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true })
  }
}

async function readImageMetadata(
  imagePath: string,
): Promise<ThumbnailMetadata | null> {
  const normalizedRelativePath = imagePath.replace(/^\/+/, '')
  const absolutePath = path.join(process.cwd(), normalizedRelativePath)

  if (!fssync.existsSync(absolutePath)) {
    console.warn(`⚠️  Image not found: ${imagePath}`)
    return null
  }

  try {
    const imageBuffer = await fs.readFile(absolutePath)

    // SVG는 LQIP를 만들지 않고 viewBox/width/height만 사용한다.
    // sharp는 width/height 속성이 없는 SVG도 viewBox에서 크기를 읽을 수 있다.
    if (path.extname(absolutePath).toLowerCase() === '.svg') {
      const svgMetadata = await sharp(imageBuffer).metadata()
      if (!svgMetadata.width || !svgMetadata.height) {
        return null
      }

      return {
        width: svgMetadata.width,
        height: svgMetadata.height,
        base64: '',
        isAnimated: false,
      }
    }

    const { metadata } = await lqipModern(imageBuffer)

    if (!metadata) {
      return null
    }

    // sharp를 사용해 animated 이미지 감지 (pages > 1이면 animated)
    const sharpMetadata = await sharp(imageBuffer).metadata()
    const isAnimated = (sharpMetadata.pages ?? 1) > 1

    return {
      width: metadata.originalWidth ?? 0,
      height: metadata.originalHeight ?? 0,
      base64: metadata.dataURIBase64 ?? '',
      isAnimated,
    }
  } catch (error) {
    console.warn(`⚠️  Failed to process image: ${imagePath}`, error)
    return null
  }
}

/**
 * 디렉토리 내 모든 이미지 파일을 재귀적으로 수집
 */
async function collectAllImagesFromDir(
  rootDir: string,
  basePublicPath: string,
  entries: ThumbnailMetadataMap,
): Promise<void> {
  if (!fssync.existsSync(rootDir)) {
    return
  }

  const dirents = await fs.readdir(rootDir, { withFileTypes: true })

  for (const dirent of dirents) {
    const fullPath = path.join(rootDir, dirent.name)

    if (dirent.isDirectory()) {
      // 재귀적으로 하위 디렉토리 탐색
      await collectAllImagesFromDir(
        fullPath,
        `${basePublicPath}/${dirent.name}`,
        entries,
      )
    } else if (dirent.isFile()) {
      const ext = path.extname(dirent.name).toLowerCase()
      if (IMAGE_EXTENSIONS.has(ext)) {
        const publicPath = `${basePublicPath}/${dirent.name}`

        // 이미 처리된 이미지는 스킵
        if (entries[publicPath]) continue

        const metadata = await readImageMetadata(publicPath)
        if (metadata) {
          entries[publicPath] = metadata
        }
      }
    }
  }
}

async function collectAllImageMetadata(): Promise<ThumbnailMetadataMap> {
  const entries: ThumbnailMetadataMap = {}

  // posts 디렉토리의 모든 이미지 수집
  const postsDir = path.join(process.cwd(), PATHS.FS.PUBLIC_POSTS_DIR)
  await collectAllImagesFromDir(postsDir, '/public/posts', entries)

  // projects 디렉토리의 모든 이미지 수집
  const projectsDir = path.join(process.cwd(), PATHS.FS.PUBLIC_PROJECTS_DIR)
  await collectAllImagesFromDir(projectsDir, '/public/projects', entries)

  return entries
}

function serializeMetadata(entries: ThumbnailMetadataMap): string {
  const sortedEntries = Object.entries(entries).sort(([a], [b]) =>
    a.localeCompare(b),
  )
  const json = JSON.stringify(Object.fromEntries(sortedEntries), null, 2)

  return `// 이 파일은 scripts/generate-image-metadata.ts 스크립트에 의해 생성되었습니다.
// 직접 수정하지 마세요.
// 포스트/프로젝트 디렉토리 내 모든 이미지의 메타데이터(width, height, LQIP base64)를 포함합니다.

import { ThumbnailMetadataMap } from '@/entities/post/model/types'

export const THUMBNAIL_METADATA_MAP = ${json} as const satisfies ThumbnailMetadataMap
`
}

async function main(): Promise<void> {
  console.log('🔍 Scanning images in posts and projects directories...')

  const entries = await collectAllImageMetadata()
  const fileContent = serializeMetadata(entries)
  await ensureDirExists(OUTPUT_PATH)
  await fs.writeFile(OUTPUT_PATH, fileContent)

  console.log(
    `✅ Generated image metadata for ${Object.keys(entries).length} image(s).`,
  )
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
