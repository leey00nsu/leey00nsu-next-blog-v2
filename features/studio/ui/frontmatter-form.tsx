'use client'

import { useEffect } from 'react'
import { FieldErrors, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  frontmatterSchema,
  makeFrontmatterSchema,
  type Frontmatter,
  type FrontmatterInput,
} from '@/entities/studio/model/frontmatter-schema'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { Switch } from '@/shared/ui/switch'
import { TagInput } from '@/shared/ui/tag-input'

interface FrontmatterFormProps {
  value?: Frontmatter
  initial?: Partial<Frontmatter>
  onSubmit?: (fm: Frontmatter) => void
  onChange?: (fm: Frontmatter, errors: FieldErrors) => void
  existingSlugs?: string[]
  suggestionTags?: string[]
}

type FrontmatterFormValues = Omit<FrontmatterInput, 'draft' | 'tagsText'> & {
  draft: boolean
  tagsText: string
}

export function FrontmatterForm({
  value,
  initial,
  onSubmit,
  onChange,
  existingSlugs = [],
  suggestionTags = [],
}: FrontmatterFormProps) {
  const defaultValues: FrontmatterFormValues = {
    slug: initial?.slug ?? value?.slug ?? '',
    title: initial?.title ?? value?.title ?? '',
    description: initial?.description ?? value?.description ?? '',
    writer: initial?.writer ?? value?.writer ?? 'leey00nsu',
    section: initial?.section ?? value?.section ?? 'blog',
    series: initial?.series ?? value?.series ?? '',
    date: initial?.date ?? value?.date ?? new Date().toISOString().slice(0, 10),
    thumbnail: initial?.thumbnail ?? value?.thumbnail ?? '/public/posts/...',
    draft: initial?.draft ?? value?.draft ?? false,
    tagsText: (initial?.tags ?? value?.tags ?? []).join(', '),
  }

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(makeFrontmatterSchema({ existingSlugs })),
    defaultValues,
    mode: 'onChange',
  })

  // const submit = handleSubmit((data) => {
  //   const parsed = frontmatterSchema.parse(data)
  //   const tags = (parsed.tagsText ?? '')
  //     .split(',')
  //     .map((t) => t.trim())
  //     .filter(Boolean)
  //   const result: Frontmatter = { ...parsed, tags }
  //   onSubmit?.(result)
  // })

  const values = watch()

  // 값 변경시 상위로 전달
  useEffect(() => {
    try {
      const parsed = frontmatterSchema.parse(values)
      const tags = (parsed.tagsText ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      const result: Frontmatter = { ...parsed, tags }

      onChange?.(result, errors)
    } catch {}
  }, [
    values.slug,
    values.title,
    values.description,
    values.writer,
    values.section,
    values.series,
    values.date,
    values.thumbnail,
    values.draft,
    values.tagsText,
  ])

  const draft = watch('draft')

  return (
    <form className="border-border mb-6 space-y-4 rounded-lg border p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="slug">슬러그</Label>
          <Input id="slug" placeholder="my-post-slug" {...register('slug')} />
          {errors.slug && (
            <p className="text-destructive mt-1 text-xs">
              {errors.slug.message as string}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="date">작성일</Label>
          <Input id="date" type="date" {...register('date')} />
          {errors.date && (
            <p className="text-destructive mt-1 text-xs">
              {errors.date.message as string}
            </p>
          )}
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="title">제목</Label>
          <Input id="title" placeholder="포스트 제목" {...register('title')} />
          {errors.title && (
            <p className="text-destructive mt-1 text-xs">
              {errors.title.message as string}
            </p>
          )}
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="description">설명</Label>
          <Textarea
            id="description"
            placeholder="간단한 설명"
            {...register('description')}
          />
          {errors.description && (
            <p className="text-destructive mt-1 text-xs">
              {errors.description.message as string}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="writer">작성자</Label>
          <Input id="writer" placeholder="작성자" {...register('writer')} />
          {errors.writer && (
            <p className="text-destructive mt-1 text-xs">
              {errors.writer.message as string}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="section">섹션</Label>
          <Input id="section" placeholder="blog" {...register('section')} />
          {errors.section && (
            <p className="text-destructive mt-1 text-xs">
              {errors.section.message as string}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="series">시리즈</Label>
          <Input
            id="series"
            placeholder="없으면 비워두세요"
            {...register('series')}
          />
          {errors.series && (
            <p className="text-destructive mt-1 text-xs">
              {errors.series.message as string}
            </p>
          )}
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="tagsText">태그</Label>
          <TagInput
            value={(values.tagsText ?? '')
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)}
            onChange={(next) =>
              setValue('tagsText', next.join(', '), { shouldDirty: true })
            }
            suggestions={suggestionTags}
          />
          <input id="tagsText" type="hidden" {...register('tagsText')} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="thumbnail">썸네일 경로</Label>
          <Input
            id="thumbnail"
            placeholder="/public/posts/.."
            {...register('thumbnail')}
          />
          {errors.thumbnail && (
            <p className="text-destructive mt-1 text-xs">
              {errors.thumbnail.message as string}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Switch
            id="draft"
            checked={draft}
            onCheckedChange={(v) =>
              setValue('draft', Boolean(v), { shouldDirty: true })
            }
          />
          <Label htmlFor="draft">임시글(draft)</Label>
        </div>
      </div>
    </form>
  )
}
