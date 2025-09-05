import { z } from 'zod'

export const makeFrontmatterSchema = (params: {
  existingSlugs: string[]
  // 썸네일로 선택 가능한 경로 목록(마크다운에서 사용 중인 pending 이미지)
  allowedThumbnailPaths?: string[]
}) => {
  const { existingSlugs, allowedThumbnailPaths = [] } = params

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
        .union([
          z
            .string()
            .regex(
              /^\/(?:public\/)?posts\/[\w\-\/\.]+$/,
              '경로는 /public/posts/... 또는 /posts/... 형식이어야 합니다.',
            ),
          z.null(),
        ])
        .nullable(),
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

      // 썸네일이 문자열이라면 허용된 경로(마크다운에서 사용 중인 pending 이미지) 중 하나여야 함
      if (
        typeof data.thumbnail === 'string' &&
        data.thumbnail.length > 0 &&
        allowedThumbnailPaths.length > 0
      ) {
        const ok = allowedThumbnailPaths.includes(data.thumbnail)
        if (!ok) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['thumbnail'],
            message: '본문에 사용 중인 이미지 중에서만 선택할 수 있습니다.',
          })
        }
      }
    })
}

export const frontmatterSchema = makeFrontmatterSchema({ existingSlugs: [] })

export type Frontmatter = z.infer<typeof frontmatterSchema>
