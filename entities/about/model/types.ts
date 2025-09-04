import z from 'zod'

export const AboutMetaSchema = z.object({
  title: z.string().default('About'),
  description: z.string().optional(),
})

export const AboutSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  content: z.string(),
})

export type About = z.infer<typeof AboutSchema>

