// 이미지 관련 스키마 및 타입 정의 (zod 기반)
// - PendingImageMap: 아직 실제 파일로 저장되지 않았지만, 미리보기를 위해 브라우저 메모리에 보관 중인 이미지 목록
//   키는 최종 마크다운에 들어갈 절대 경로(`/public/posts/{slug}/{filename}`), 값은 objectURL 등을 포함합니다.

import { z } from 'zod'

// 브라우저 환경에서만 사용되는 File/FileList는 런타임 가용성 이슈를 피하기 위해
// 스키마는 클라이언트 컴포넌트에서만 사용되도록 합니다.

export const PendingImageEntrySchema = z.object({
  // 저장 시 전송할 원본 파일 (에디터에서는 선택 사항)
  file: z.instanceof(File).optional(),
  // 미리보기용 objectURL (저장 전 렌더링에 사용)
  objectURL: z.string(),
})
export type PendingImageEntry = z.infer<typeof PendingImageEntrySchema>

export const PendingImageMapSchema = z.record(
  z.string(),
  PendingImageEntrySchema,
)
export type PendingImageMap = z.infer<typeof PendingImageMapSchema>

// 이미지 다이얼로그 폼 스키마
export const ImageDialogFormSchema = z
  .object({
    file: z.instanceof(FileList).optional(),
    src: z.string().optional(),
    altText: z.string().optional(),
    title: z.string().optional(),
    width: z.number().min(0).optional(),
    height: z.number().min(0).optional(),
  })
  .refine((v) => (v.file && v.file.length > 0) || (v.src && v.src.length > 0), {
    // 파일 또는 URL 둘 중 하나는 입력되어야 합니다.
    message: '파일 또는 URL 중 하나는 필수입니다.',
    path: ['src'],
  })
export type ImageDialogFormValues = z.infer<typeof ImageDialogFormSchema>
