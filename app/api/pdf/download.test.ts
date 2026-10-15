// @vitest-environment node

import path from 'node:path'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET as getResumePdf } from '@/app/api/pdf/resume/route'
import { GET as getPortfolioPdf } from '@/app/api/pdf/portfolio/route'

const fileSystemMocks = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFile: vi.fn(),
}))

vi.mock('node:fs', () => ({
  default: { existsSync: fileSystemMocks.existsSync },
  promises: { readFile: fileSystemMocks.readFile },
}))

describe('PDF downloads', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-30T15:00:00Z'))
    fileSystemMocks.existsSync.mockReturnValue(true)
    fileSystemMocks.readFile.mockResolvedValue(Buffer.from('%PDF-1.7'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it.each([
    ['resume', 'ko', '이윤수_이력서_2610.pdf'],
    ['portfolio', 'ko', '이윤수_포트폴리오_2610.pdf'],
    ['resume', 'en', 'leeyoonsu_resume_2610.pdf'],
    ['portfolio', 'en', 'leeyoonsu_portfolio_2610.pdf'],
  ] as const)(
    '%s %s: 저장된 PDF에 언어별 이름과 한국 시간의 다운로드 연월을 붙인다',
    async (documentKind, locale, expectedFileName) => {
      const request = new NextRequest(
        `http://localhost/api/pdf/${documentKind}`,
        { headers: { cookie: `locale=${locale}` } },
      )
      const getPdf = documentKind === 'resume' ? getResumePdf : getPortfolioPdf

      const response = await getPdf(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/pdf')
      const disposition = response.headers.get('Content-Disposition')!
      expect(
        decodeURIComponent(disposition.split("filename*=UTF-8''")[1]),
      ).toBe(expectedFileName)
      expect(disposition).toContain(
        `filename="leeyoonsu_${documentKind}_2610.pdf"`,
      )
      expect(response.headers.get('Cache-Control')).toBe('private, no-store')
      expect(fileSystemMocks.readFile).toHaveBeenCalledWith(
        path.join(
          process.cwd(),
          'public',
          'pdf',
          `${documentKind}-${locale}.pdf`,
        ),
      )
      expect(await response.text()).toBe('%PDF-1.7')
    },
  )

  it.each([
    ['2026-09-30T14:59:59Z', '2609'],
    ['2026-12-31T15:00:00Z', '2701'],
  ])(
    '한국 시간 월·연도 경계를 반영한다: %s',
    async (downloadDate, expectedYearMonth) => {
      vi.setSystemTime(new Date(downloadDate))
      const request = new NextRequest('http://localhost/api/pdf/resume', {
        headers: { cookie: 'locale=en' },
      })

      const response = await getResumePdf(request)

      expect(response.headers.get('Content-Disposition')).toContain(
        `filename="leeyoonsu_resume_${expectedYearMonth}.pdf"`,
      )
      expect(fileSystemMocks.readFile).toHaveBeenCalledWith(
        path.join(process.cwd(), 'public', 'pdf', 'resume-en.pdf'),
      )
    },
  )
})
