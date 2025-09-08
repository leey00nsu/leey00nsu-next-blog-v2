'use client'

import * as Dialog from '@radix-ui/react-dialog'
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCellValues, usePublisher } from '@mdxeditor/editor'
import { editorRootElementRef$, useTranslation } from '@mdxeditor/editor'
import {
  allowSetImageDimensions$,
  closeImageDialog$,
  imageDialogState$,
  imageUploadHandler$,
  saveImage$,
} from '@mdxeditor/editor'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'
import { useStudioEditorContext } from './editor'
import {
  ImageDialogFormSchema,
  type ImageDialogFormValues,
} from '@/features/editor/model/types'

export function CustomImageDialog() {
  const [
    state,
    editorRootElementRef,
    imageUploadHandler,
    allowSetImageDimensions,
  ] = useCellValues(
    imageDialogState$,
    editorRootElementRef$,
    imageUploadHandler$,
    allowSetImageDimensions$,
  )

  const saveImage = usePublisher(saveImage$)
  const closeImageDialog = usePublisher(closeImageDialog$)
  const t = useTranslation()
  const { slug } = useStudioEditorContext() ?? {}

  const { register, handleSubmit, reset, setValue, watch, formState } =
    useForm<ImageDialogFormValues>({
      resolver: zodResolver(ImageDialogFormSchema),
      values: state.type === 'editing' ? state.initialValues : {},
      mode: 'onChange',
    })

  const resetFormState = () => {
    reset({
      src: '',
      title: '',
      altText: '',
      width: undefined,
      height: undefined,
    })
  }

  if (state.type === 'inactive') return null

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await handleSubmit(saveImage)(e)
    resetFormState()
  }

  const fileList = watch('file')
  const hasFileSelected = Boolean(fileList && fileList.length > 0)

  return (
    <Dialog.Root
      open
      onOpenChange={(open: boolean) => {
        if (!open) {
          closeImageDialog()
          resetFormState()
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/40" />
        <Dialog.Content
          className="bg-background fixed top-1/2 left-1/2 z-[101] w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border p-5 shadow-xl outline-none"
          onOpenAutoFocus={(e: Event) => {
            e.preventDefault()
          }}
        >
          <Dialog.Title className="mb-4 text-lg font-semibold">
            {t('uploadImage.dialogTitle', 'Upload an image')}
          </Dialog.Title>

          <form onSubmit={onSubmit} className="space-y-4">
            {imageUploadHandler !== null && (
              <div className="space-y-2">
                <Label htmlFor="file">
                  {t(
                    'uploadImage.uploadInstructions',
                    'Upload an image from your device:',
                  )}
                </Label>
                <Input
                  id="file"
                  type="file"
                  accept="image/*"
                  {...register('file')}
                />
                {!slug && hasFileSelected && (
                  <p className="text-xs text-muted-foreground">
                    슬러그가 비어 있으므로 경로는 <code>/public/posts/.../</code> 에 삽입됩니다.
                    슬러그 설정 후 자동으로 새 경로로 매핑됩니다.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="src">
                {imageUploadHandler === null
                  ? t(
                      'uploadImage.addViaUrlInstructionsNoUpload',
                      'Add an image from an URL:',
                    )
                  : t(
                      'uploadImage.addViaUrlInstructions',
                      'Or add an image from an URL:',
                    )}
              </Label>
              <Input
                id="src"
                placeholder={t(
                  'uploadImage.autoCompletePlaceholder',
                  'Select or paste an image src',
                )}
                {...register('src')}
                onChange={(e) =>
                  setValue('src', e.target.value, { shouldDirty: true })
                }
              />
              {formState.errors.src && (
                <p className="text-xs text-red-600">
                  {String(formState.errors.src.message)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="altText">{t('uploadImage.alt', 'Alt:')}</Label>
                <Input id="altText" type="text" {...register('altText')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">
                  {t('uploadImage.title', 'Title:')}
                </Label>
                <Input id="title" type="text" {...register('title')} />
              </div>
            </div>

            {allowSetImageDimensions && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="width">
                    {t('uploadImage.width', 'Width:')}
                  </Label>
                  <Input
                    id="width"
                    type="number"
                    min={0}
                    {...register('width', {
                      // 빈 문자열은 undefined로 변환하여 optional 동작 보장
                      setValueAs: (v) =>
                        v === '' || v === null ? undefined : Number(v),
                    })}
                  />
                  {formState.errors.width && (
                    <p className="text-xs text-red-600">
                      {String(formState.errors.width.message)}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">
                    {t('uploadImage.height', 'Height:')}
                  </Label>
                  <Input
                    id="height"
                    type="number"
                    min={0}
                    {...register('height', {
                      setValueAs: (v) =>
                        v === '' || v === null ? undefined : Number(v),
                    })}
                  />
                  {formState.errors.height && (
                    <p className="text-xs text-red-600">
                      {String(formState.errors.height.message)}
                    </p>
                  )}
                </div>
              </div>
            )}

            <Separator />

            <div className="flex justify-end gap-2">
              <Button type="submit">
                {t('dialogControls.save', 'Save')}
              </Button>
              <Dialog.Close asChild>
                <Button type="reset" variant="outline">
                  {t('dialogControls.cancel', 'Cancel')}
                </Button>
              </Dialog.Close>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
