/**
 * Portfolio PDF API
 *
 * 빌드 시점에 생성된 포트폴리오 PDF 파일을 반환합니다.
 * PDF는 postbuild 단계에서 `pnpm run gen:resume-pdf` 스크립트로 생성됩니다.
 * 저장 위치: public/pdf/portfolio-{locale}.pdf
 */

import fs from 'node:fs'
import { promises as fsp } from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { buildPdfFileName, PDF } from '@/shared/config/constants'
import { determineSupportedLocale } from '@/shared/lib/locale/determine-supported-locale'

export const runtime = 'nodejs'

const PDF_DIR = path.join(process.cwd(), 'public', 'pdf')

function bufferToArrayBuffer(
  buffer: Uint8Array,
): ArrayBuffer | SharedArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  )
}

export async function GET(request: NextRequest) {
  const localeCookie = request.cookies.get('locale')?.value ?? null
  const locale = determineSupportedLocale([localeCookie])
  const pdfFileName = buildPdfFileName(PDF.DOCUMENT_KIND.PORTFOLIO, locale)
  const pdfFilePath = path.join(PDF_DIR, pdfFileName)

  if (!fs.existsSync(pdfFilePath)) {
    return NextResponse.json(
      {
        error: `PDF not found for locale: ${locale}. Run "pnpm run build" to generate.`,
      },
      { status: 404 },
    )
  }

  try {
    const pdfBuffer = await fsp.readFile(pdfFilePath)
    const pdfArrayBuffer = bufferToArrayBuffer(pdfBuffer)

    return new NextResponse(pdfArrayBuffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdfFileName}"`,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('[pdf] Failed to read portfolio PDF file:', error)
    return NextResponse.json(
      { error: 'Failed to read PDF file' },
      { status: 500 },
    )
  }
}
