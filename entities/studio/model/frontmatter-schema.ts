import { z } from 'zod'

export const makeFrontmatterSchema = (params: { existingSlugs: string[] }) => {
  const { existingSlugs } = params

  return z
    .object({
      slug: z
        .string()
        .min(1, 'slug은 비어 있을 수 없습니다.')
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, '소문자-숫자-하이픈 조합만 허용'),
      title: z.string().min(1, '제목은 필수입니다.'),
      description: z.string().min(1, '설명은 필수입니다.'),
      writer: z.string().min(1, '작성자는 필수입니다.'),
      section: z.string().min(1, '섹션은 필수입니다.'),
      series: z.string().optional().nullable(),
      // YYYY-MM-DD
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/i, '날짜 형식은 YYYY-MM-DD 입니다.'),
      thumbnail: z
        .string()
        .min(1, '썸네일 경로는 필수입니다.')
        .regex(
          /^\/(?:public\/)?posts\/[\w\-\/\.]+$/,
          '경로는 /public/posts/... 또는 /posts/... 형식이어야 합니다.',
        ),
      draft: z.boolean().default(false),
      tags: z.string().array(),
    })
    .superRefine((data, ctx) => {
      const cur = (data.slug ?? '').trim().toLowerCase()

      if (!cur) return

      const dup = existingSlugs.some((s) => s.trim().toLowerCase() === cur)

      if (dup) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['slug'],
          message: '이미 존재하는 slug입니다.',
        })
      }
    })
}

export const frontmatterSchema = makeFrontmatterSchema({ existingSlugs: [] })

export type Frontmatter = z.infer<typeof frontmatterSchema>
