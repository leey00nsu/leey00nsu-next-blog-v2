import { describe, expect, it } from 'vitest'
import {
  getAllProjects,
  getDeployedProjects,
  getProjectBySlug,
  getPublishedAndDeployedProjects,
} from '@/entities/project/lib/project'

const ABOUT_PROJECT_SLUGS = [
  'blog',
  'copysinger',
  'lee-spec-kit',
  'leemage',
  'leesfield',
] as const

const DEPLOYED_PROJECT_SLUGS = [
  'copysinger',
  'day-7',
  'stock-aquarium',
  'leesfield',
  'leemage',
  'lee-spec-kit',
  'syu-character-maker',
] as const

const PUBLISHED_AND_DEPLOYED_PROJECT_SLUGS = [
  ...ABOUT_PROJECT_SLUGS,
  'day-7',
  'stock-aquarium',
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
  it('keeps the existing projects used by the about page', async () => {
    const projects = await getAllProjects('ko')

    expect(projects.map((project) => project.slug).sort()).toEqual(
      [...ABOUT_PROJECT_SLUGS].sort(),
    )
  })

  it('returns deployed projects in their configured order', async () => {
    const projects = await getDeployedProjects('ko')

    expect(projects.map((project) => project.slug)).toEqual(
      DEPLOYED_PROJECT_SLUGS,
    )
  })

  it('combines published and deployed projects without duplicates', async () => {
    const projects = await getPublishedAndDeployedProjects('ko')

    expect(projects.map((project) => project.slug).sort()).toEqual(
      [...PUBLISHED_AND_DEPLOYED_PROJECT_SLUGS].sort(),
    )
  })

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

      for (const heading of PROJECT_CONTENT_HEADINGS[locale]) {
        expect(project?.content).toContain(heading)
      }
    },
  )
})
