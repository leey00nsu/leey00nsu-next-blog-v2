/**
 * 빌드 시점에 resume PDF를 생성하는 스크립트
 *
 * postbuild에서 실행되며:
 * 1. 임시로 Next.js 서버 시작 (포트 3001)
 * 2. Playwright로 /print/resume 페이지 렌더링
 * 3. 모든 로케일에 대해 PDF 생성
 * 4. 서버 종료
 *
 * PDF는 public/pdf/portfolio-{locale}.pdf에 저장됩니다.
 */

import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import { promises as fsp } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { LOCALES, type SupportedLocale } from '@/shared/config/constants'

const PDF_DIR = path.join(process.cwd(), 'public', 'pdf')
const SERVER_PORT = 3001
const BASE_URL = `http://localhost:${SERVER_PORT}`
const SERVER_STARTUP_TIMEOUT_MS = 30000
const SERVER_STARTUP_CHECK_INTERVAL_MS = 500

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
        path.join(root, dir, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
        path.join(root, dir, 'chrome-mac-arm64', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
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

  const serverProcess = spawn('pnpm', ['next', 'start', '-p', String(SERVER_PORT)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
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
  while (Date.now() - startTime < SERVER_STARTUP_TIMEOUT_MS) {
    try {
      const response = await fetch(`${BASE_URL}/print/resume`)
      if (response.ok) {
        console.log('  Server is ready!')
        return serverProcess
      }
    } catch {
      // 서버가 아직 준비되지 않음
    }
    await new Promise((resolve) => setTimeout(resolve, SERVER_STARTUP_CHECK_INTERVAL_MS))
  }

  serverProcess.kill()
  throw new Error('Server startup timeout')
}

function stopServer(serverProcess: ChildProcess): void {
  console.log('  Stopping server...')
  serverProcess.kill('SIGTERM')
}

async function generatePdfForLocale(
  executablePath: string,
  locale: SupportedLocale,
): Promise<void> {
  const targetUrl = new URL('/print/resume', BASE_URL)
  const cacheFile = path.join(PDF_DIR, `portfolio-${locale}.pdf`)

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
    await page.goto(targetUrl.toString(), { waitUntil: 'networkidle' })
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

    await fsp.writeFile(cacheFile, pdfBuffer)
    console.log(`  ✅ Generated portfolio-${locale}.pdf`)
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

  try {
    serverProcess = await startServer()

    for (const locale of LOCALES.SUPPORTED) {
      try {
        await generatePdfForLocale(executablePath, locale)
      } catch (error) {
        console.error(`  ❌ Failed to generate portfolio-${locale}.pdf:`, error)
      }
    }

    console.log('[gen:resume-pdf] Done!')
  } finally {
    if (serverProcess) {
      stopServer(serverProcess)
    }
  }
}

void (async () => {
  try {
    await main()
  } catch (error) {
    console.error('[gen:resume-pdf] Failed:', error)
    process.exitCode = 1
  }
})()
