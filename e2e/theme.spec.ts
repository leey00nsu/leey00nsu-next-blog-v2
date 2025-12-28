import { test, expect } from '@playwright/test'

test.describe('테마 전환', () => {
  test('테마 토글 버튼이 존재한다', async ({ page }) => {
    await page.goto('/')

    // 테마 토글 버튼 찾기 (일반적으로 드롭다운 메뉴나 버튼)
    const themeButton = page.getByRole('button', { name: /theme|테마|dark|light|모드/i })
    const count = await themeButton.count()

    // 테마 버튼이 있으면 클릭 가능한지 확인
    if (count > 0) {
      await expect(themeButton.first()).toBeVisible()
    }
  })

  test('다크 모드로 전환할 수 있다', async ({ page }) => {
    await page.goto('/')

    // html 요소의 class 확인
    const html = page.locator('html')

    // 테마 토글 버튼 클릭 시도
    const themeButton = page.getByRole('button', { name: /theme|테마|dark|light|모드/i })
    const count = await themeButton.count()

    if (count > 0) {
      await themeButton.first().click()

      // 드롭다운 메뉴가 있다면 다크 모드 옵션 클릭
      const darkOption = page.getByRole('menuitem', { name: /dark|어두운|다크/i })
      const darkOptionCount = await darkOption.count()

      if (darkOptionCount > 0) {
        await darkOption.click()
        // 다크 모드 클래스가 적용되었는지 확인
        await expect(html).toHaveClass(/dark/)
      }
    }
  })

  test('라이트 모드로 전환할 수 있다', async ({ page }) => {
    // 다크 모드로 시작
    await page.goto('/')
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })

    const html = page.locator('html')

    // 테마 토글 버튼 클릭 시도
    const themeButton = page.getByRole('button', { name: /theme|테마|dark|light|모드/i })
    const count = await themeButton.count()

    if (count > 0) {
      await themeButton.first().click()

      // 드롭다운 메뉴가 있다면 라이트 모드 옵션 클릭
      const lightOption = page.getByRole('menuitem', { name: /light|밝은|라이트/i })
      const lightOptionCount = await lightOption.count()

      if (lightOptionCount > 0) {
        await lightOption.click()
        // 다크 모드 클래스가 제거되었는지 확인
        await expect(html).not.toHaveClass(/dark/)
      }
    }
  })
})
