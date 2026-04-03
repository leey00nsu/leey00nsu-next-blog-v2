import { expect, test } from '@playwright/test'

test.describe('블로그 챗봇 위젯', () => {
  test('팝업이 우측 사이드바에 가려지지 않고 닫을 수 있다', async ({
    page,
  }) => {
    await page.goto('/ko/blog')

    await page.getByRole('button', { name: '블로그 Q&A 열기' }).click()

    const hitTarget = await page.evaluate(() => {
      const closeButton = [...document.querySelectorAll('button')].find(
        (element) => element.getAttribute('aria-label') === '블로그 Q&A 닫기',
      )

      if (!closeButton) {
        return null
      }

      const { left, top, width, height } = closeButton.getBoundingClientRect()
      const targetElement = document.elementFromPoint(
        left + width / 2,
        top + height / 2,
      )

      return {
        tagName: targetElement?.tagName ?? null,
        ariaLabel: targetElement?.getAttribute('aria-label') ?? null,
      }
    })

    expect(hitTarget).toEqual({
      tagName: 'BUTTON',
      ariaLabel: '블로그 Q&A 닫기',
    })

    const closeButton = page
      .locator('[data-slot="card"]')
      .getByRole('button', { name: '블로그 Q&A 닫기' })

    await closeButton.click()
    await expect(closeButton).toBeHidden()
  })
})
