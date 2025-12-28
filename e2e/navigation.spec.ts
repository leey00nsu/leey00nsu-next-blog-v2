import { test, expect } from '@playwright/test'

test.describe('페이지 네비게이션', () => {
  test('홈페이지에 접근할 수 있다', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/leey00nsu/)
  })

  test('블로그 페이지에 접근할 수 있다', async ({ page }) => {
    await page.goto('/blog')
    await expect(page.locator('main')).toBeVisible()
  })

  test('프로젝트 페이지에 접근할 수 있다', async ({ page }) => {
    await page.goto('/projects')
    await expect(page.locator('main')).toBeVisible()
  })

  test('About 페이지에 접근할 수 있다', async ({ page }) => {
    await page.goto('/about')
    await expect(page.locator('main')).toBeVisible()
  })

  test('헤더 네비게이션 링크가 동작한다', async ({ page }) => {
    await page.goto('/')

    // 헤더 nav 내의 블로그 링크 클릭 (한국어: 블로그, 영어: Blog)
    await page.locator('nav').getByRole('link', { name: /blog|블로그/i }).click()
    await expect(page).toHaveURL(/\/blog/)

    // 헤더 nav 내의 소개 링크 클릭 (한국어: 소개, 영어: About)
    await page.locator('nav').getByRole('link', { name: /about|소개/i }).click()
    await expect(page).toHaveURL(/\/about/)
  })
})
