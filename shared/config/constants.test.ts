import { describe, it, expect } from 'vitest'
import {
  buildPostMdxRelativePath,
  buildPostMdxRelativePathLocalized,
  buildProjectMdxRelativePath,
  buildProjectMdxRelativePathLocalized,
  buildLocalizedRoutePath,
  stripLocalePrefix,
  buildBlogPostHref,
  buildBlogTagHref,
  buildProjectHref,
  PATHS,
  LOCALES,
} from './constants'

describe('경로 빌더 함수', () => {
  describe('buildPostMdxRelativePath', () => {
    it('포스트 MDX 경로를 생성한다', () => {
      expect(buildPostMdxRelativePath('my-post')).toBe(
        'public/posts/my-post/my-post.mdx'
      )
    })
  })

  describe('buildPostMdxRelativePathLocalized', () => {
    it('로케일이 포함된 포스트 MDX 경로를 생성한다', () => {
      expect(buildPostMdxRelativePathLocalized('my-post', 'ko')).toBe(
        'public/posts/my-post/my-post.ko.mdx'
      )
      expect(buildPostMdxRelativePathLocalized('my-post', 'en')).toBe(
        'public/posts/my-post/my-post.en.mdx'
      )
    })
  })

  describe('buildProjectMdxRelativePath', () => {
    it('프로젝트 MDX 경로를 생성한다', () => {
      expect(buildProjectMdxRelativePath('my-project')).toBe(
        'public/projects/my-project/my-project.mdx'
      )
    })
  })

  describe('buildProjectMdxRelativePathLocalized', () => {
    it('로케일이 포함된 프로젝트 MDX 경로를 생성한다', () => {
      expect(buildProjectMdxRelativePathLocalized('my-project', 'ko')).toBe(
        'public/projects/my-project/my-project.ko.mdx'
      )
    })
  })

  describe('buildBlogPostHref', () => {
    it('블로그 포스트 URL을 생성한다', () => {
      expect(buildBlogPostHref('my-post')).toBe('/blog/my-post')
    })

    it('로케일이 지정되면 로케일 프리픽스를 붙인다', () => {
      expect(buildBlogPostHref('my-post', 'ko')).toBe('/ko/blog/my-post')
      expect(buildBlogPostHref('my-post', 'en')).toBe('/en/blog/my-post')
    })
  })

  describe('buildBlogTagHref', () => {
    it('태그 필터 URL을 생성한다', () => {
      expect(buildBlogTagHref('react')).toBe('/blog?tag=react')
    })

    it('특수문자가 포함된 태그를 인코딩한다', () => {
      expect(buildBlogTagHref('c++')).toBe('/blog?tag=c%2B%2B')
    })

    it('로케일이 지정되면 로케일 프리픽스를 붙인다', () => {
      expect(buildBlogTagHref('react', 'ko')).toBe('/ko/blog?tag=react')
    })
  })

  describe('buildProjectHref', () => {
    it('프로젝트 URL을 생성한다', () => {
      expect(buildProjectHref('my-project')).toBe('/projects/my-project')
    })

    it('로케일이 지정되면 로케일 프리픽스를 붙인다', () => {
      expect(buildProjectHref('my-project', 'en')).toBe('/en/projects/my-project')
    })
  })

  describe('buildLocalizedRoutePath', () => {
    it('루트 경로를 로케일 경로로 변환한다', () => {
      expect(buildLocalizedRoutePath('/', 'ko')).toBe('/ko')
    })

    it('일반 경로를 로케일 경로로 변환한다', () => {
      expect(buildLocalizedRoutePath('/blog', 'en')).toBe('/en/blog')
    })
  })

  describe('stripLocalePrefix', () => {
    it('로케일 프리픽스를 제거한다', () => {
      expect(stripLocalePrefix('/ko/blog')).toBe('/blog')
    })

    it('로케일 루트는 일반 루트로 변환한다', () => {
      expect(stripLocalePrefix('/en')).toBe('/')
    })
  })
})

describe('상수 값', () => {
  it('PATHS.FS 경로가 정의되어 있다', () => {
    expect(PATHS.FS.PUBLIC_DIR).toBe('public')
    expect(PATHS.FS.PUBLIC_POSTS_DIR).toBe('public/posts')
    expect(PATHS.FS.PUBLIC_PROJECTS_DIR).toBe('public/projects')
  })

  it('LOCALES가 정의되어 있다', () => {
    expect(LOCALES.SUPPORTED).toContain('ko')
    expect(LOCALES.SUPPORTED).toContain('en')
    expect(LOCALES.DEFAULT).toBe('ko')
  })
})
