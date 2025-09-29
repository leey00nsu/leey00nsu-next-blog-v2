import fs from 'node:fs'
import { promises as fsp } from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { chromium } from 'playwright'
import { LOCALES, SupportedLocale } from '@/shared/config/constants'

export const runtime = 'nodejs'

function resolveLocale(searchLocale: string | null): SupportedLocale {
  if (!searchLocale) return LOCALES.DEFAULT
  const normalized = searchLocale.toLowerCase()
  return LOCALES.SUPPORTED.includes(normalized as SupportedLocale)
    ? (normalized as SupportedLocale)
    : LOCALES.DEFAULT
}

function locateChromiumExecutable(): string | null {
  const explicit =
    process.env.PLAYWRIGHT_EXECUTABLE_PATH ??
    process.env.PUPPETEER_EXECUTABLE_PATH
  if (explicit && fs.existsSync(explicit)) {
    return explicit
  }

  const browsersRoot =
    process.env.PLAYWRIGHT_BROWSERS_PATH ?? process.env.PLAYWRIGHT_CACHE_DIR

  const searchRoots = [
    // 사용자 지정 경로
    ...(browsersRoot ? [browsersRoot] : []),
    // 일반적인 캐시 경로
    path.join(process.cwd(), 'node_modules', '.cache', 'playwright'),
    '/app/.cache/playwright',
    '/app/.cache/ms-playwright',
    '/root/.cache/playwright',
    '/root/.cache/ms-playwright',
  ]

  for (const root of searchRoots) {
    if (!root || !fs.existsSync(root)) continue
    const candidate = findLatestChromiumBinary(root)
    if (candidate) return candidate
  }

  const builtin = chromium.executablePath()
  if (builtin && fs.existsSync(builtin)) {
    return builtin
  }

  return null
}

function findLatestChromiumBinary(root: string): string | null {
  try {
    const directories = fs
      .readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => b.localeCompare(a))

    for (const dir of directories) {
      const candidatePaths = [
        path.join(root, dir, 'chrome-linux', 'chrome'),
        path.join(root, dir, 'chrome-linux64', 'chrome'),
      ]

      const match = candidatePaths.find((candidate) => fs.existsSync(candidate))
      if (match) return match
    }
  } catch (error) {
    console.warn('[pdf] failed to inspect playwright cache', root, error)
  }

  return null
}

function bufferToArrayBuffer(
  buffer: Uint8Array,
): ArrayBuffer | SharedArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  )
}

function resolveBaseUrl(requestOrigin: string): string {
  const authenticationUrlFromEnvironment = process.env.AUTH_URL
  if (!authenticationUrlFromEnvironment) {
    return requestOrigin
  }

  try {
    const parsedUrl = new URL(authenticationUrlFromEnvironment)
    return parsedUrl.origin
  } catch (error) {
    console.warn(
      '[pdf] invalid AUTH_URL value, falling back to request origin',
      authenticationUrlFromEnvironment,
      error,
    )
    return requestOrigin
  }
}

export async function GET(request: NextRequest) {
  const localeParam = request.nextUrl.searchParams.get('locale')
  const locale = resolveLocale(localeParam)

  const baseUrl = resolveBaseUrl(request.nextUrl.origin)
  const targetUrl = new URL('/print/resume', baseUrl)
  targetUrl.searchParams.set('locale', locale)

  const cacheDir =
    process.env.RESUME_PDF_CACHE_DIR ??
    path.join(process.cwd(), '.next', 'cache', 'resume-pdf')
  const cacheFile = path.join(cacheDir, `${locale}.pdf`)
  const cacheTtlRaw = process.env.RESUME_PDF_CACHE_TTL
  const cacheTtlMs = cacheTtlRaw ? Number(cacheTtlRaw) : 1000 * 60 * 60 * 24
  const hasTtl = Number.isFinite(cacheTtlMs) && cacheTtlMs > 0

  await fsp.mkdir(cacheDir, { recursive: true })

  if (fs.existsSync(cacheFile)) {
    try {
      const stat = await fsp.stat(cacheFile)
      const isFresh = !hasTtl || Date.now() - stat.mtimeMs <= cacheTtlMs
      if (isFresh) {
        const cachedBuffer = await fsp.readFile(cacheFile)
        const cachedArrayBuffer = bufferToArrayBuffer(cachedBuffer)
        return new NextResponse(cachedArrayBuffer as ArrayBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="portfolio-${locale}.pdf"`,
            'Cache-Control': 'no-store',
          },
        })
      }
    } catch (error) {
      console.warn('[pdf] failed to read cached resume pdf', cacheFile, error)
    }
  }

  const executablePath = locateChromiumExecutable()
  if (!executablePath) {
    throw new Error(
      'Chromium executable not found. Set PLAYWRIGHT_EXECUTABLE_PATH or ensure playwright downloaded Chromium.',
    )
  }

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  let context: Awaited<ReturnType<typeof browser.newContext>> | null = null

  try {
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    })
    const page = await context.newPage()
    await page.goto(targetUrl.toString(), { waitUntil: 'networkidle' })
    await page.emulateMedia({ media: 'screen' })
    const baseHref = baseUrl

    await page.evaluate((base: string) => {
      const anchors = document.querySelectorAll('a[href]')
      for (const anchor of anchors) {
        const href = anchor.getAttribute('href')
        if (!href) continue
        if (href.startsWith('#')) {
          anchor.removeAttribute('href')
          continue
        }
        if (href.startsWith('/')) {
          anchor.setAttribute('href', new URL(href, base).toString())
        }
        anchor.setAttribute('target', '_blank')
        anchor.setAttribute('rel', 'noopener noreferrer')
      }
    }, baseHref)
    await page.addStyleTag({
      content: `
        nav, footer, aside, [data-next-route-announcer], [data-nextjs-toolbox],
        #__next_devtools_container, #__next-route-announcer, #__next_devtools_panel,
        .nextjs-toast-container { display: none !important; }
        body { background: white !important; }
        main { padding: 0 !important; }
      `,
    })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        bottom: '15mm',
        left: '15mm',
        right: '15mm',
      },
    })

    const pdfArrayBuffer = bufferToArrayBuffer(pdfBuffer)

    try {
      await fsp.writeFile(cacheFile, pdfBuffer)
    } catch (error) {
      console.warn('[pdf] failed to cache resume pdf', cacheFile, error)
    }
    const pdfBlob = new Blob([pdfArrayBuffer as ArrayBuffer], {
      type: 'application/pdf',
    })

    return new NextResponse(pdfBlob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="portfolio-${locale}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Failed to generate PDF', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 },
    )
  } finally {
    if (context) {
      await context.close()
    }
    await browser.close()
  }
}
