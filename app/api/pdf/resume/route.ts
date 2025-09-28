import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import { LOCALES, SupportedLocale } from '@/shared/config/constants'

export const runtime = 'nodejs'

function resolveLocale(searchLocale: string | null): SupportedLocale {
  if (!searchLocale) return LOCALES.DEFAULT
  const normalized = searchLocale.toLowerCase()
  return LOCALES.SUPPORTED.includes(normalized as SupportedLocale)
    ? (normalized as SupportedLocale)
    : LOCALES.DEFAULT
}

export async function GET(request: NextRequest) {
  const localeParam = request.nextUrl.searchParams.get('locale')
  const locale = resolveLocale(localeParam)

  const targetUrl = new URL('/print/resume', request.nextUrl.origin)
  targetUrl.searchParams.set('locale', locale)

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 })
    await page.goto(targetUrl.toString(), { waitUntil: 'networkidle0' })
    await page.emulateMediaType('screen')
    await page.evaluate(() => {
      const anchors = document.querySelectorAll('a[href]')
      for (const anchor of anchors) {
        const href = anchor.getAttribute('href')
        if (!href) continue
        if (href.startsWith('#')) {
          anchor.removeAttribute('href')
          continue
        }
        if (href.startsWith('/')) {
          anchor.setAttribute(
            'href',
            new URL(href, globalThis.location.origin).toString(),
          )
        }
        anchor.setAttribute('target', '_blank')
        anchor.setAttribute('rel', 'noopener noreferrer')
      }
    })
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

    const pdfArrayBuffer = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength,
    ) as ArrayBuffer
    const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' })

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
    await browser.close()
  }
}
