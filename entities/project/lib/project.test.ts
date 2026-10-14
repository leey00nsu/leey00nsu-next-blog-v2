import { describe, expect, it } from 'vitest'
import {
  getAllProjects,
  getDeployedProjects,
  getProjectBySlug,
  getPublishedAndDeployedProjects,
} from '@/entities/project/lib/project'

const ABOUT_PROJECT_SLUGS = [
  'leement',
  'copysinger',
  'blog',
  'leesfield',
  'lee-spec-kit',
  'leemage',
] as const

const DEPLOYED_PROJECT_SLUGS = [
  'leement',
  'copysinger',
  'day-7',
  'stock-aquarium',
  'leesfield',
  'lee-spec-kit',
  'leemage',
  'syu-character-maker',
] as const

const PUBLISHED_AND_DEPLOYED_PROJECT_SLUGS = [
  'leement',
  'copysinger',
  'day-7',
  'stock-aquarium',
  'blog',
  'leesfield',
  'lee-spec-kit',
  'leemage',
  'syu-character-maker',
] as const

const PROJECT_CONTENT_HEADINGS = {
  ko: [
    '## 프로젝트 소개',
    '## 핵심 기능',
    '## Problem',
    '## Solution',
    '## Impact',
  ],
  en: [
    '## Project Overview',
    '## Key Features',
    '## Problem',
    '## Solution',
    '## Impact',
  ],
} as const

describe('project queries', () => {
  it.each(['ko', 'en'] as const)(
    '%s 소개 프로젝트를 기간 기준으로 정렬하고 초안을 제외한다',
    async (locale) => {
      const projects = await getAllProjects(locale)

      expect(projects.map((project) => project.slug)).toEqual(
        ABOUT_PROJECT_SLUGS,
      )
    },
  )

  it.each(['ko', 'en'] as const)(
    '%s 배포 프로젝트를 기간 기준으로 정렬하고 배포된 초안을 포함한다',
    async (locale) => {
      const projects = await getDeployedProjects(locale)

      expect(projects.map((project) => project.slug)).toEqual(
        DEPLOYED_PROJECT_SLUGS,
      )
    },
  )

  it.each(['ko', 'en'] as const)(
    '%s 공개·배포 프로젝트를 중복 없이 합쳐 기간 기준으로 정렬한다',
    async (locale) => {
      const projects = await getPublishedAndDeployedProjects(locale)

      expect(projects.map((project) => project.slug)).toEqual(
        PUBLISHED_AND_DEPLOYED_PROJECT_SLUGS,
      )
    },
  )

  it.each([
    ['copysinger', 'ko'],
    ['copysinger', 'en'],
    ['day-7', 'ko'],
    ['day-7', 'en'],
    ['stock-aquarium', 'ko'],
    ['stock-aquarium', 'en'],
  ] as const)(
    '%s %s 문서는 기존 프로젝트 글 구조를 따른다',
    async (slug, locale) => {
      const project = await getProjectBySlug(slug, locale)

      expect(project).not.toBeNull()

      const headings =
        slug === 'copysinger'
          ? locale === 'ko'
            ? ['## 프로젝트 소개', '## 주요 기능', '## 핵심 문제와 해결']
            : [
                '## Project Overview',
                '## Key Features',
                '## Key Challenges and Solutions',
              ]
          : PROJECT_CONTENT_HEADINGS[locale]
      for (const heading of headings) {
        expect(project?.content).toContain(heading)
      }
    },
  )
})
