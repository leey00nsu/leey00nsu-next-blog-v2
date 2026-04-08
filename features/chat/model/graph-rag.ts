import { z } from 'zod'
import { ChatSourceCategorySchema } from '@/features/chat/model/chat-evidence'
import { LOCALES, type SupportedLocale } from '@/shared/config/constants'

export const GRAPH_RAG_ENTITY_KINDS = [
  'title',
  'tag',
  'term',
] as const

export const GraphRagEntityKindSchema = z.enum(GRAPH_RAG_ENTITY_KINDS)

export const GRAPH_RAG_RELATION_TYPES = [
  'co_occurs',
  'same_slug',
] as const

export const GraphRagRelationTypeSchema = z.enum(GRAPH_RAG_RELATION_TYPES)

export const GraphRagChunkSchema = z.object({
  id: z.string(),
  locale: z.enum(LOCALES.SUPPORTED),
  slug: z.string(),
  title: z.string(),
  url: z.string(),
  excerpt: z.string(),
  content: z.string(),
  sectionTitle: z.string().nullable(),
  tags: z.array(z.string()),
  searchTerms: z.array(z.string()),
  publishedAt: z.string().datetime().nullable().optional(),
  sourceCategory: ChatSourceCategorySchema,
  entityIds: z.array(z.string()),
})

export const GraphRagEntitySchema = z.object({
  id: z.string(),
  locale: z.enum(LOCALES.SUPPORTED),
  name: z.string(),
  normalizedName: z.string(),
  kind: GraphRagEntityKindSchema,
  chunkIds: z.array(z.string()),
})

export const GraphRagRelationSchema = z.object({
  id: z.string(),
  locale: z.enum(LOCALES.SUPPORTED),
  sourceEntityId: z.string(),
  targetEntityId: z.string(),
  type: GraphRagRelationTypeSchema,
  weight: z.number(),
})

export const GraphRagIndexSchema = z.object({
  locale: z.enum(LOCALES.SUPPORTED),
  chunks: z.array(GraphRagChunkSchema),
  entities: z.array(GraphRagEntitySchema),
  relations: z.array(GraphRagRelationSchema),
})

export interface GraphRagChunk extends z.infer<typeof GraphRagChunkSchema> {}
export type GraphRagEntityKind = z.infer<typeof GraphRagEntityKindSchema>
export interface GraphRagEntity extends z.infer<typeof GraphRagEntitySchema> {}
export type GraphRagRelationType = z.infer<typeof GraphRagRelationTypeSchema>
export interface GraphRagRelation extends z.infer<typeof GraphRagRelationSchema> {}
export interface GraphRagIndex extends z.infer<typeof GraphRagIndexSchema> {}

export type GeneratedGraphRagIndexMap = Record<SupportedLocale, GraphRagIndex>
