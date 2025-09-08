'use client'

import { useEffect } from 'react'
import { FieldErrors, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  makeFrontmatterSchema,
  type Frontmatter,
} from '@/entities/studio/model/frontmatter-schema'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { Switch } from '@/shared/ui/switch'
import { TagInput } from '@/shared/ui/tag-input'
import { finalizeSlug, sanitizeSlug } from '@/features/studio/lib/slug'

interface FrontmatterFormProps {
  value?: Frontmatter
  initial?: Partial<Frontmatter>
  onSubmit?: (fm: Frontmatter) => void
  onChange?: (fm: Frontmatter, errors: FieldErrors<Frontmatter>) => void
  onValidityChange?: (ok: boolean) => void
  existingSlugs?: string[]
  suggestionTags?: string[]
  // 마크다운 본문에서 사용 중인 pending 이미지들 (썸네일 후보)
  thumbnailChoices?: { path: string; previewUrl: string }[]
}

export function FrontmatterForm({
  value,
  initial,
  onSubmit,
  onChange,
  onValidityChange,
  existingSlugs = [],
  suggestionTags = [],
  thumbnailChoices = [],
}: FrontmatterFormProps) {
  const defaultValues: Frontmatter = {
    slug: initial?.slug ?? value?.slug ?? '',
    title: initial?.title ?? value?.title ?? '',
    description: initial?.description ?? value?.description ?? '',
    writer: initial?.writer ?? value?.writer ?? 'leey00nsu',
    section: initial?.section ?? value?.section ?? 'blog',
    series: initial?.series ?? value?.series ?? '',
    date: initial?.date ?? value?.date ?? new Date().toISOString().slice(0, 10),
    thumbnail: initial?.thumbnail ?? value?.thumbnail ?? null,
    draft: initial?.draft ?? value?.draft ?? false,
    tags: initial?.tags ?? value?.tags ?? [],
  }

  const schema = makeFrontmatterSchema({
    existingSlugs,
    allowedThumbnailPaths: thumbnailChoices.map((c) => c.path),
  })

  const {
    register,
    watch,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm<z.input<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange',
  })

  const values = watch()

  // 값 변경시 상위로 전달
  useEffect(() => {
    onChange?.(values as Frontmatter, errors)
    onValidityChange?.(isValid)
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
    values.tags,
    isValid,
  ])

  const draft = watch('draft')

  // 외부 value.thumbnail이 변경되면 폼의 thumbnail 값 동기화
  useEffect(() => {
    if (typeof value?.thumbnail === 'string' || value?.thumbnail === null) {
      setValue('thumbnail', value.thumbnail, { shouldValidate: true })
    }
  }, [value?.thumbnail, setValue])

  // 썸네일 후보(thumbnailChoices)가 바뀌어 현재 선택이 유효하지 않으면 null로 리셋
  useEffect(() => {
    const cur = watch('thumbnail') as string | null | undefined
    if (!cur) return
    const exists = thumbnailChoices.some((c) => c.path === cur)
    if (!exists) {
      setValue('thumbnail', null, { shouldValidate: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thumbnailChoices])

  return (
    <form className="border-border mb-6 space-y-4 rounded-lg border p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="slug">슬러그</Label>
          {(() => {
            const slugReg = register('slug')
            const slugVal = watch('slug') ?? ''
            return (
              <Input
                id="slug"
                placeholder="my-post-slug"
                value={slugVal}
                onChange={(e) =>
                  setValue('slug', sanitizeSlug(e.target.value), {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                onBlur={(e) => {
                  setValue('slug', finalizeSlug(e.target.value), {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                  slugReg.onBlur(e)
                }}
                ref={slugReg.ref}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="text"
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              />
            )
          })()}
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
            value={values.tags}
            onChange={(next) => setValue('tags', next, { shouldDirty: true })}
            suggestions={suggestionTags}
          />
          <input id="tagsText" type="hidden" {...register('tags')} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="thumbnailSelect">썸네일 선택(선택 사항)</Label>
          <div className="space-y-2">
            <select
              id="thumbnailSelect"
              className="bg-background w-full rounded-md border px-3 py-2 text-sm"
              value={watch('thumbnail') ?? ''}
              onChange={(e) =>
                setValue(
                  'thumbnail',
                  e.target.value ? (e.target.value as string) : null,
                  { shouldDirty: true, shouldValidate: true },
                )
              }
            >
              <option value="">없음</option>
              {thumbnailChoices.map((c) => (
                <option key={c.path} value={c.path}>
                  {c.path}
                </option>
              ))}
            </select>
            {/* thumbnail 필드를 폼에 등록하여 밸리데이션 및 제출 시 포함 */}
            <input type="hidden" {...register('thumbnail')} />
            {errors.thumbnail && (
              <p className="text-destructive mt-1 text-xs">
                {errors.thumbnail.message as string}
              </p>
            )}
            {watch('thumbnail') && (
              <img
                alt="thumbnail preview"
                className="mt-2 h-24 w-auto rounded border"
                src={
                  thumbnailChoices.find((c) => c.path === watch('thumbnail'))
                    ?.previewUrl
                }
              />
            )}
          </div>
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
