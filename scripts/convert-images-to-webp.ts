import fs from 'node:fs/promises'
import fssync from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const PUBLIC_DIR = path.join(process.cwd(), 'public')
const EXTENSIONS_TO_CONVERT = new Set(['.png', '.gif'])

interface ConversionResult {
  original: string
  converted: string
  originalSize: number
  convertedSize: number
}

/**
 * 디렉토리 내 모든 PNG/GIF 파일을 재귀적으로 찾음
 */
async function findImagesToConvert(dir: string): Promise<string[]> {
  const results: string[] = []

  if (!fssync.existsSync(dir)) {
    return results
  }

  const dirents = await fs.readdir(dir, { withFileTypes: true })

  for (const dirent of dirents) {
    const fullPath = path.join(dir, dirent.name)

    if (dirent.isDirectory()) {
      const subResults = await findImagesToConvert(fullPath)
      results.push(...subResults)
    } else if (dirent.isFile()) {
      const ext = path.extname(dirent.name).toLowerCase()
      if (EXTENSIONS_TO_CONVERT.has(ext)) {
        results.push(fullPath)
      }
    }
  }

  return results
}

/**
 * 이미지를 WebP로 변환
 */
async function convertToWebP(
  imagePath: string,
): Promise<ConversionResult | null> {
  try {
    const originalBuffer = await fs.readFile(imagePath)
    const originalSize = originalBuffer.length

    const ext = path.extname(imagePath).toLowerCase()
    const webpPath = imagePath.replace(/\.(png|gif)$/i, '.webp')

    let sharpInstance = sharp(originalBuffer)

    // GIF의 경우 애니메이션 지원을 위해 animated 옵션 사용
    if (ext === '.gif') {
      sharpInstance = sharp(originalBuffer, { animated: true })
    }

    const webpBuffer = await sharpInstance
      .webp({ quality: 80, effort: 6 })
      .toBuffer()

    await fs.writeFile(webpPath, webpBuffer)

    return {
      original: imagePath,
      converted: webpPath,
      originalSize,
      convertedSize: webpBuffer.length,
    }
  } catch (error) {
    console.error(`❌ Failed to convert: ${imagePath}`, error)
    return null
  }
}

/**
 * 원본 파일 삭제
 */
async function removeOriginals(results: ConversionResult[]): Promise<void> {
  for (const result of results) {
    try {
      await fs.unlink(result.original)
    } catch (error) {
      console.error(`❌ Failed to delete: ${result.original}`, error)
    }
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

async function main(): Promise<void> {
  console.log('🔍 Scanning for PNG and GIF files...')

  const imagePaths = await findImagesToConvert(PUBLIC_DIR)
  console.log(`📁 Found ${imagePaths.length} images to convert`)

  if (imagePaths.length === 0) {
    console.log('✅ No images to convert')
    return
  }

  const results: ConversionResult[] = []
  let totalOriginalSize = 0
  let totalConvertedSize = 0

  for (const imagePath of imagePaths) {
    const relativePath = path.relative(process.cwd(), imagePath)
    process.stdout.write(`Converting: ${relativePath}...`)

    const result = await convertToWebP(imagePath)

    if (result) {
      results.push(result)
      totalOriginalSize += result.originalSize
      totalConvertedSize += result.convertedSize

      const savings = (
        (1 - result.convertedSize / result.originalSize) *
        100
      ).toFixed(1)
      console.log(
        ` ✅ ${formatBytes(result.originalSize)} → ${formatBytes(result.convertedSize)} (-${savings}%)`,
      )
    } else {
      console.log(' ❌ Failed')
    }
  }

  // 원본 파일 삭제
  console.log('\n🗑️  Removing original files...')
  await removeOriginals(results)

  // 요약
  const totalSavings = (
    (1 - totalConvertedSize / totalOriginalSize) *
    100
  ).toFixed(1)
  console.log(`
📊 Conversion Summary:
   Converted: ${results.length}/${imagePaths.length} images
   Total size: ${formatBytes(totalOriginalSize)} → ${formatBytes(totalConvertedSize)}
   Savings: ${formatBytes(totalOriginalSize - totalConvertedSize)} (-${totalSavings}%)
`)

  console.log('⚠️  Remember to update image references in MDX files!')
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
