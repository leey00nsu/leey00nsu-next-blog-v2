/**
 * 빌드 및 개발 서버 시작 시 PDF를 생성하는 스크립트
 *
 * pnpm dev 또는 postbuild에서 실행되며:
 * 1. Next.js 서버 시작 (개발: PORT, 빌드 후: PDF_SERVER_PORT, 기본 3000)
 * 2. Playwright로 /print/resume, /print/portfolio 페이지 렌더링
 * 3. 모든 로케일/문서 종류에 대해 PDF 생성
 * 4. 빌드 모드는 서버 종료, --dev 모드는 개발 서버 유지
 *
 * PDF는 public/pdf/{documentKind}-{locale}.pdf에 저장됩니다.
 */

import dotenv from 'dotenv'
import { spawn, type ChildProcess } from 'node:child_process'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import { promises as fsp } from 'node:fs'
import path from 'node:path'
import { chromium, type Page } from 'playwright'
import {
  buildPdfFileName,
  LOCALES,
  PDF,
  type PdfDocumentKind,
  type SupportedLocale,
} from '@/shared/config/constants'

// next dev와 동일하게 .env의 PORT는 개발 서버 포트로 사용하지 않습니다.
const DEVELOPMENT_SERVER_PORT = process.env.PORT
dotenv.config()

const PDF_DIR = path.join(process.cwd(), 'public', 'pdf')
const PDF_SERVER = {
  DEVELOPMENT_ARGUMENT: '--dev',
  DEFAULT_PORT: 3000,
  DEVELOPMENT_STARTUP_TIMEOUT_MS: 120_000,
  REQUEST_TIMEOUT_MS: 5000,
} as const
const IS_DEVELOPMENT = process.argv.includes(PDF_SERVER.DEVELOPMENT_ARGUMENT)
const SERVER_PORT = Number(
  (IS_DEVELOPMENT ? DEVELOPMENT_SERVER_PORT : process.env.PDF_SERVER_PORT) ??
    PDF_SERVER.DEFAULT_PORT,
)
const requireFromProject = createRequire(
  path.join(process.cwd(), 'package.json'),
)
const BASE_URL = `http://localhost:${SERVER_PORT}`
const SERVER_STARTUP_TIMEOUT_MS = 30_000
const SERVER_STARTUP_CHECK_INTERVAL_MS = 500
const PDF_RENDER = {
  SCALE: 0.85,
  PAGE_MARGIN: '10mm',
  VIEWPORT_WIDTH_PX: 1440,
  VIEWPORT_HEIGHT_PX: 1080,
  DEVICE_SCALE_FACTOR: 2,
  IMAGE_PRELOAD_INITIAL_WAIT_MS: 800,
  IMAGE_PRELOAD_SCROLL_STEP_PX: 600,
  IMAGE_PRELOAD_SCROLL_WAIT_MS: 80,
  IMAGE_PRELOAD_TIMEOUT_MS: 20_000,
  IMAGE_PRELOAD_RETRY_WAIT_MS: 120,
} as const

interface PdfGenerationTarget {
  documentKind: PdfDocumentKind
  printRoute: string
}

const PDF_GENERATION_TARGETS: PdfGenerationTarget[] = [
  {
    documentKind: PDF.DOCUMENT_KIND.RESUME,
    printRoute: PDF.PRINT_ROUTE.RESUME,
  },
  {
    documentKind: PDF.DOCUMENT_KIND.PORTFOLIO,
    printRoute: PDF.PRINT_ROUTE.PORTFOLIO,
  },
]

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
    ...(browsersRoot ? [browsersRoot] : []),
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
        path.join(
          root,
          dir,
          'chrome-mac',
          'Chromium.app',
          'Contents',
          'MacOS',
          'Chromium',
        ),
        path.join(
          root,
          dir,
          'chrome-mac-arm64',
          'Chromium.app',
          'Contents',
          'MacOS',
          'Chromium',
        ),
      ]

      const match = candidatePaths.find((candidate) => fs.existsSync(candidate))
      if (match) return match
    }
  } catch {
    // ignore
  }

  return null
}

async function startServer(): Promise<ChildProcess> {
  console.log(`  Starting Next.js server on port ${SERVER_PORT}...`)

  const serverProcess = spawn(
    process.execPath,
    [
      requireFromProject.resolve('next/dist/bin/next'),
      IS_DEVELOPMENT ? 'dev' : 'start',
      '-p',
      String(SERVER_PORT),
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )
  let startupError: Error | null = null
  serverProcess.on('error', (error) => {
    startupError = error
  })
  const handleShutdown = () => {
    stopServer(serverProcess)
  }
  process.once('SIGINT', handleShutdown)
  process.once('SIGTERM', handleShutdown)
  serverProcess.once('exit', (exitCode, signal) => {
    process.removeListener('SIGINT', handleShutdown)
    process.removeListener('SIGTERM', handleShutdown)
    if (IS_DEVELOPMENT && !signal && exitCode) {
      process.exitCode = exitCode
    }
  })

  serverProcess.stdout?.on('data', (data) => {
    const message = data.toString().trim()
    if (message) console.log(`  [server] ${message}`)
  })

  serverProcess.stderr?.on('data', (data) => {
    const message = data.toString().trim()
    if (message) console.error(`  [server] ${message}`)
  })

  // 서버가 준비될 때까지 대기
  const startTime = Date.now()
  const startupTimeout = IS_DEVELOPMENT
    ? PDF_SERVER.DEVELOPMENT_STARTUP_TIMEOUT_MS
    : SERVER_STARTUP_TIMEOUT_MS
  while (Date.now() - startTime < startupTimeout) {
    if (startupError) throw startupError
    if (serverProcess.exitCode !== null || serverProcess.signalCode !== null) {
      throw new Error('Next.js server exited before PDF generation could start')
    }
    try {
      const response = await fetch(`${BASE_URL}${PDF.PRINT_ROUTE.RESUME}`, {
        signal: AbortSignal.timeout(PDF_SERVER.REQUEST_TIMEOUT_MS),
      })
      if (response.ok) {
        console.log('  Server is ready!')
        return serverProcess
      }
    } catch {
      // 서버가 아직 준비되지 않음
    }
    await new Promise((resolve) =>
      setTimeout(resolve, SERVER_STARTUP_CHECK_INTERVAL_MS),
    )
  }

  serverProcess.kill()
  throw new Error('Server startup timeout')
}

function stopServer(serverProcess: ChildProcess): void {
  console.log('  Stopping server...')
  serverProcess.kill('SIGTERM')
}

async function preparePageForPdf(page: Page): Promise<void> {
  await page.emulateMedia({ media: 'screen' })

  // 상대 링크를 절대 URL로 변환 (프로덕션 URL 사용)
  const productionUrl = process.env.AUTH_URL ?? BASE_URL
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
  }, productionUrl)

  // 불필요한 UI 요소 숨김
  await page.addStyleTag({
    content: `
        nav, footer, aside, nextjs-portal, [data-next-route-announcer],
        [data-nextjs-toolbox], [data-nextjs-toast], [data-nextjs-dialog],
        [data-nextjs-dialog-overlay],
        #__next_devtools_container, #__next-route-announcer, #__next_devtools_panel,
        .nextjs-toast-container { display: none !important; }
        body { background: white !important; }
        main { padding: 0 !important; }
      `,
  })

  // lazy 이미지가 PDF 캡처 이전에 모두 로드되도록 강제 preloading 수행
  await page.evaluate(
    async ({
      imagePreloadInitialWaitMilliseconds,
      imagePreloadScrollStepPixel,
      imagePreloadScrollWaitMilliseconds,
      imagePreloadTimeoutMilliseconds,
      imagePreloadRetryWaitMilliseconds,
    }) => {
      await new Promise((resolve) => {
        setTimeout(resolve, imagePreloadInitialWaitMilliseconds)
      })

      {
        const imageElements = document.querySelectorAll<HTMLImageElement>('img')
        for (const imageElement of imageElements) {
          imageElement.loading = 'eager'
          imageElement.decoding = 'sync'
          imageElement.setAttribute('loading', 'eager')
          imageElement.setAttribute('decoding', 'sync')
          imageElement.setAttribute('fetchpriority', 'high')
        }
      }

      {
        const documentElement = document.documentElement
        const maxScrollTop = Math.max(
          documentElement.scrollHeight - globalThis.innerHeight,
          0,
        )

        for (
          let currentScrollTop = 0;
          currentScrollTop <= maxScrollTop;
          currentScrollTop += imagePreloadScrollStepPixel
        ) {
          globalThis.scrollTo(0, currentScrollTop)
          await new Promise((resolve) => {
            setTimeout(resolve, imagePreloadScrollWaitMilliseconds)
          })
        }

        globalThis.scrollTo(0, 0)
        await new Promise((resolve) => {
          setTimeout(resolve, imagePreloadScrollWaitMilliseconds)
        })
      }

      const timeoutAt = Date.now() + imagePreloadTimeoutMilliseconds
      while (Date.now() < timeoutAt) {
        let hasPendingImage = false
        const imageElements = document.querySelectorAll<HTMLImageElement>('img')
        for (const imageElement of imageElements) {
          imageElement.loading = 'eager'
          imageElement.decoding = 'sync'
          imageElement.setAttribute('loading', 'eager')
          imageElement.setAttribute('decoding', 'sync')
          imageElement.setAttribute('fetchpriority', 'high')

          if (!(imageElement.complete && imageElement.naturalWidth > 0)) {
            hasPendingImage = true
          }
        }

        if (!hasPendingImage) {
          break
        }

        await new Promise((resolve) => {
          setTimeout(resolve, imagePreloadRetryWaitMilliseconds)
        })
      }
    },
    {
      imagePreloadInitialWaitMilliseconds:
        PDF_RENDER.IMAGE_PRELOAD_INITIAL_WAIT_MS,
      imagePreloadScrollStepPixel: PDF_RENDER.IMAGE_PRELOAD_SCROLL_STEP_PX,
      imagePreloadScrollWaitMilliseconds:
        PDF_RENDER.IMAGE_PRELOAD_SCROLL_WAIT_MS,
      imagePreloadTimeoutMilliseconds: PDF_RENDER.IMAGE_PRELOAD_TIMEOUT_MS,
      imagePreloadRetryWaitMilliseconds: PDF_RENDER.IMAGE_PRELOAD_RETRY_WAIT_MS,
    },
  )
}

async function generatePdfForLocale(
  executablePath: string,
  locale: SupportedLocale,
  pdfGenerationTarget: PdfGenerationTarget,
): Promise<void> {
  const targetUrl = new URL(pdfGenerationTarget.printRoute, BASE_URL)
  const pdfFileName = buildPdfFileName(pdfGenerationTarget.documentKind, locale)
  const cacheFile = path.join(PDF_DIR, pdfFileName)

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  let context: Awaited<ReturnType<typeof browser.newContext>> | null = null

  try {
    context = await browser.newContext({
      viewport: {
        width: PDF_RENDER.VIEWPORT_WIDTH_PX,
        height: PDF_RENDER.VIEWPORT_HEIGHT_PX,
      },
      deviceScaleFactor: PDF_RENDER.DEVICE_SCALE_FACTOR,
    })

    await context.addCookies([
      {
        name: 'locale',
        value: locale,
        domain: 'localhost',
        path: '/',
        sameSite: 'Lax',
        secure: false,
        httpOnly: false,
      },
    ])

    const page = await context.newPage()
    const response = await page.goto(targetUrl.toString(), {
      waitUntil: 'networkidle',
      timeout: PDF_SERVER.DEVELOPMENT_STARTUP_TIMEOUT_MS,
    })
    if (!response?.ok()) {
      throw new Error(`Print page returned HTTP ${response?.status()}`)
    }
    await page.evaluate(() => document.fonts.ready)
    await preparePageForPdf(page)

    const pdfBuffer = await page.pdf({
      format: 'A4',
      scale: PDF_RENDER.SCALE,
      printBackground: true,
      margin: {
        top: PDF_RENDER.PAGE_MARGIN,
        bottom: PDF_RENDER.PAGE_MARGIN,
        left: PDF_RENDER.PAGE_MARGIN,
        right: PDF_RENDER.PAGE_MARGIN,
      },
    })

    await fsp.writeFile(cacheFile, pdfBuffer)
    console.log(`  ✅ Generated ${pdfFileName}`)
  } finally {
    if (context) {
      await context.close()
    }
    await browser.close()
  }
}

async function main(): Promise<void> {
  console.log('[gen:resume-pdf] Starting PDF generation...')

  const executablePath = locateChromiumExecutable()
  if (!executablePath) {
    console.error(
      '[gen:resume-pdf] Chromium executable not found. Run "pnpm exec playwright install chromium" first.',
    )
    process.exitCode = 1
    return
  }

  console.log(`  Chromium: ${executablePath}`)
  console.log(`  Output dir: ${PDF_DIR}`)

  await fsp.mkdir(PDF_DIR, { recursive: true })

  let serverProcess: ChildProcess | null = null
  let generationCompleted = false
  const failedPdfFiles: string[] = []

  try {
    serverProcess = await startServer()

    for (const locale of LOCALES.SUPPORTED) {
      for (const pdfGenerationTarget of PDF_GENERATION_TARGETS) {
        const pdfFileName = buildPdfFileName(
          pdfGenerationTarget.documentKind,
          locale,
        )

        try {
          await generatePdfForLocale(
            executablePath,
            locale,
            pdfGenerationTarget,
          )
        } catch (error) {
          failedPdfFiles.push(pdfFileName)
          console.error(`  ❌ Failed to generate ${pdfFileName}:`, error)
        }
      }
    }

    if (failedPdfFiles.length > 0) {
      throw new Error(`PDF generation failed: ${failedPdfFiles.join(', ')}`)
    }
    generationCompleted = true
    console.log('[gen:resume-pdf] Done!')
    if (IS_DEVELOPMENT) {
      console.log(`Development server remains available at ${BASE_URL}`)
    }
  } finally {
    if (serverProcess && (!IS_DEVELOPMENT || !generationCompleted)) {
      stopServer(serverProcess)
    }
  }
}

// eslint-disable-next-line unicorn/prefer-top-level-await -- CJS 형식에서 Top-level await 미지원
void (async () => {
  try {
    await main()
  } catch (error) {
    console.error('[gen:resume-pdf] Failed:', error)
    process.exitCode = 1
  }
})()
