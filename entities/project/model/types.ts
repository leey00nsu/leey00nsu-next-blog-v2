import z from 'zod'
import { SupportedLocale } from '@/shared/config/constants'

export const PROJECT_TYPE_VALUES = ['team', 'solo'] as const

export const PROJECT_DEPLOYMENT_STATUS_VALUES = [
  'active',
  'maintained',
] as const

export const PROJECT_DEPLOYMENT_KIND_VALUES = ['service', 'package'] as const

export const PROJECT_DEPLOYMENT_CATEGORY_VALUES = [
  'aiService',
  'infrastructure',
  'developerTool',
  'dataVisualization',
  'interactiveContent',
  'interactiveWeb',
] as const

export const ProjectTypeSchema = z.enum(PROJECT_TYPE_VALUES)

export type ProjectType = z.infer<typeof ProjectTypeSchema>

export const ProjectDeploymentStatusSchema = z.enum(
  PROJECT_DEPLOYMENT_STATUS_VALUES,
)

export const ProjectDeploymentKindSchema = z.enum(
  PROJECT_DEPLOYMENT_KIND_VALUES,
)

export const ProjectDeploymentCategorySchema = z.enum(
  PROJECT_DEPLOYMENT_CATEGORY_VALUES,
)

export const ProjectDeploymentSchema = z.object({
  status: ProjectDeploymentStatusSchema,
  kind: ProjectDeploymentKindSchema,
  category: ProjectDeploymentCategorySchema,
  url: z.string().url(),
  order: z.number().int().nonnegative(),
  coverImage: z.string().min(1),
})

export type ProjectDeployment = z.infer<typeof ProjectDeploymentSchema>

export const ProjectLinksSchema = z.object({
  github: z.string().url().optional(),
  demo: z.string().url().optional(),
  npm: z.string().url().optional(),
})

export type ProjectLinks = z.infer<typeof ProjectLinksSchema>

export const ProjectPeriodSchema = z.object({
  start: z.string().min(1, '프로젝트 시작일을 입력하세요.'),
  end: z.string().min(1).nullable().optional().default(null),
})

export const ProjectMetaDataSchema = z.object({
  slug: z.string().min(1, '프로젝트 슬러그를 입력하세요.'),
  title: z.string().min(1, '프로젝트명을 입력하세요.'),
  summary: z.string().min(1, '프로젝트 요약을 입력하세요.'),
  keyFeatures: z.array(z.string().min(1)).optional().default([]),
  links: ProjectLinksSchema.optional().default({}),
  period: ProjectPeriodSchema,
  techStacks: z
    .array(z.string().min(1))
    .min(1, '기술 스택을 최소 1개 이상 입력하세요.'),
  thumbnail: z.string().min(1).nullable().optional().default(null),
  draft: z.boolean().optional().default(false),
  type: ProjectTypeSchema,
  deployment: ProjectDeploymentSchema.optional(),
})

export const ProjectSchema = ProjectMetaDataSchema.extend({
  content: z.string().min(1, '프로젝트 내용을 입력하세요.'),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
})

export type ProjectPeriod = z.infer<typeof ProjectPeriodSchema>
export type ProjectMetaData = z.infer<typeof ProjectMetaDataSchema>
export type Project = z.infer<typeof ProjectSchema>
export type DeployedProject = Project & {
  deployment: ProjectDeployment
}

export interface GeneratedProjectSerialized {
  slug: string
  title: string
  summary: string
  keyFeatures: string[]
  links: ProjectLinks
  period: ProjectPeriod
  techStacks: string[]
  thumbnail: string | null
  draft: boolean
  type: ProjectType
  deployment?: ProjectDeployment
  content: string
  width: number
  height: number
}

export type GeneratedProjectsLocaleMap = Record<
  string,
  GeneratedProjectSerialized
>
export type GeneratedProjectsMap = Record<
  SupportedLocale,
  GeneratedProjectsLocaleMap
>
