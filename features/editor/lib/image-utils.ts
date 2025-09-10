// 이미지 경로 및 슬러그 변경 대응 유틸리티
// - 파일명 정제, 고유 경로 생성, 슬러그 변경 시 경로 일괄 치환 등을 제공합니다.

import type { PendingImageMap } from '@/features/editor/model/types'
import { PATHS } from '@/shared/config/constants'

// 모든 이미지가 위치하는 퍼블릭 루트
export const PUBLIC_POSTS_BASE = PATHS.URL.PUBLIC_POSTS_BASE

// 파일명 정제: 공백 -> 하이픈, 소문자, 허용되지 않는 문자는 제거
export function sanitizeFilename(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, '-')
    .replaceAll(/[^a-z0-9._-]/g, '')
}

// 정규식 리터럴에 안전하게 삽입하기 위한 이스케이프 유틸
function escapeForRegExp(str: string) {
  return str.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}

// 동일 파일명이 이미 존재할 경우 "-1", "-2" 식으로 뒤에 번호를 붙여 충돌을 피합니다.
export function buildUniquePath(
  slug: string | undefined,
  filename: string,
  pendingImages: PendingImageMap,
) {
  const sanitized = sanitizeFilename(filename)
  // slug가 없으면 임시 폴더('...')를 사용합니다. 저장 전까지는 실제 파일이 존재하지 않습니다.
  const folder = slug
    ? `${PUBLIC_POSTS_BASE}/${slug}/`
    : `${PUBLIC_POSTS_BASE}/.../`

  let final = sanitized
  if (pendingImages[folder + final]) {
    const extMatch = final.match(/\.[^.]+$/)
    const ext = extMatch ? extMatch[0] : ''
    const stem = ext ? final.slice(0, -ext.length) : final
    let i = 1
    while (pendingImages[folder + `${stem}-${i}${ext}`]) i += 1
    final = `${stem}-${i}${ext}`
  }
  return folder + final
}

// 마크다운 내 이미지 경로를 구 슬러그 -> 새 슬러그로 일괄 치환합니다.
// - '/public/posts/{old}/' 또는 임시 폴더('/public/posts/.../')를 '/public/posts/{next}/'로 변경
export function rewriteMarkdownImagePaths(
  markdown: string,
  oldSlug: string | null | undefined,
  nextSlug: string,
) {
  const placeholders = [
    `${PUBLIC_POSTS_BASE}/.../`,
    oldSlug ? `${PUBLIC_POSTS_BASE}/${oldSlug}/` : '',
  ].filter(Boolean) as string[]

  let next = markdown
  for (const from of placeholders) {
    const pattern = escapeForRegExp(from)
    const re = new RegExp(`(!\\[[^\\]]*\\]\\()${pattern}`, 'g')
    // 마크다운 이미지 문법(![alt](src))만 우선 안전하게 치환
    const target = nextSlug
      ? `${PUBLIC_POSTS_BASE}/${nextSlug}/`
      : `${PUBLIC_POSTS_BASE}/.../`
    next = next.replace(re, (_m, prefix) => `${prefix}${target}`)

    // HTML img 태그에 대해서도 기본적인 src 치환 수행
    const htmlRe = new RegExp(`(src=["'])${pattern}`, 'g')
    next = next.replace(htmlRe, (_m, prefix) => `${prefix}${target}`)
  }
  return next
}

// pendingImages의 키(경로)도 구 슬러그 -> 새 슬러그로 업데이트합니다.
export function remapPendingImagesSlug(
  pending: PendingImageMap,
  oldSlug: string | null | undefined,
  nextSlug: string,
) {
  const fromPrefixes = [
    `${PUBLIC_POSTS_BASE}/.../`,
    oldSlug ? `${PUBLIC_POSTS_BASE}/${oldSlug}/` : '',
  ].filter(Boolean) as string[]

  const entries = Object.entries(pending)
  const out: PendingImageMap = {}
  const target = nextSlug
    ? `${PUBLIC_POSTS_BASE}/${nextSlug}/`
    : `${PUBLIC_POSTS_BASE}/.../`
  for (const [key, val] of entries) {
    let newKey = key
    for (const prefix of fromPrefixes) {
      if (key.startsWith(prefix)) {
        newKey = key.replace(prefix, target)
        break
      }
    }
    out[newKey] = val
  }
  return out
}

// 단일 이미지 경로의 슬러그를 변경합니다.
// - '/public/posts/{old}/...' 또는 '/public/posts/.../...' 접두부를 '/public/posts/{next}/'로 바꿉니다.
export function rewriteImagePathSlug(
  path: string,
  oldSlug: string | null | undefined,
  nextSlug: string,
) {
  const fromPrefixes = [
    `${PUBLIC_POSTS_BASE}/.../`,
    oldSlug ? `${PUBLIC_POSTS_BASE}/${oldSlug}/` : '',
  ].filter(Boolean) as string[]

  const target = nextSlug
    ? `${PUBLIC_POSTS_BASE}/${nextSlug}/`
    : `${PUBLIC_POSTS_BASE}/.../`
  for (const prefix of fromPrefixes) {
    if (path.startsWith(prefix)) {
      return path.replace(prefix, target)
    }
  }
  return path
}

// 마크다운(본문)에서 사용 중인 이미지 경로를 모두 수집합니다.
// - 마크다운 이미지 문법: ![alt](src "title")
// - HTML img 태그: <img src="..."> 또는 src='...'
export function collectUsedImageSrcs(markdown: string): Set<string> {
  const result = new Set<string>()

  // 1) Markdown 이미지 패턴
  const mdImgRe = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
  let m: RegExpExecArray | null
  while ((m = mdImgRe.exec(markdown)) !== null) {
    const src = m[1]
    if (src) result.add(src)
  }

  // 2) HTML img 태그 패턴
  const htmlImgRe = /<img[^>]*\s+src\s*=\s*("([^"]+)"|'([^']+)')[^>]*>/gi
  let h: RegExpExecArray | null
  while ((h = htmlImgRe.exec(markdown)) !== null) {
    const src = h[2] ?? h[3]
    if (src) result.add(src)
  }

  return result
}
