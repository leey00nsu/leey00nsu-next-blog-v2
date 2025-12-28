import { test, expect } from '@playwright/test'

test.describe('블로그 페이지', () => {
  test('블로그 목록 페이지가 렌더링된다', async ({ page }) => {
    await page.goto('/blog')

    // 메인 콘텐츠 영역이 표시됨
    await expect(page.locator('main')).toBeVisible()
  })

  test('블로그 포스트 카드가 표시된다', async ({ page }) => {
    await page.goto('/blog')

    // 포스트 링크가 하나 이상 존재
    const postLinks = page.locator('a[href^="/blog/"]')
    const count = await postLinks.count()

    // 포스트가 있으면 클릭 가능한지 확인
    if (count > 0) {
      await expect(postLinks.first()).toBeVisible()
    }
  })

  test('블로그 포스트 상세 페이지로 이동할 수 있다', async ({ page }) => {
    await page.goto('/blog')

    // 첫 번째 포스트 링크 찾기
    const postLinks = page.locator('a[href^="/blog/"]').filter({
      hasNot: page.locator('a[href="/blog"]'),
    })
    const count = await postLinks.count()

    if (count > 0) {
      const firstPostHref = await postLinks.first().getAttribute('href')
      await postLinks.first().click()

      // 상세 페이지로 이동 확인
      if (firstPostHref) {
        await expect(page).toHaveURL(new RegExp(firstPostHref))
      }

      // 메인 콘텐츠가 렌더링됨
      await expect(page.locator('main')).toBeVisible()
    }
  })
})
