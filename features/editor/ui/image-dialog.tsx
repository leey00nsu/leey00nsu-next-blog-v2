'use client'

/**
 * ImageDialog 컴포넌트
 *
 * 이미지 삽입 다이얼로그입니다.
 * 파일 업로드, URL 입력, alt 텍스트 설정을 지원합니다.
 *
 * _Requirements: 5.1, 5.2, 5.3, 5.4_
 */

import * as Dialog from '@radix-ui/react-dialog'
import { useState, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'
import {
    ImageDialogFormSchema,
    type ImageDialogFormValues,
} from '@/features/editor/model/types'

interface ImageDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (data: {
        src: string
        alt: string
        title?: string
        width?: number
        height?: number
    }) => void
    onUpload?: (file: File) => Promise<string>
    initialValues?: {
        src?: string
        alt?: string
        title?: string
        width?: number
        height?: number
    }
}

export function ImageDialog({
    open,
    onOpenChange,
    onSubmit,
    onUpload,
    initialValues,
}: ImageDialogProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)

    const { register, handleSubmit, reset, setValue, watch, formState } =
        useForm<ImageDialogFormValues>({
            resolver: zodResolver(ImageDialogFormSchema),
            defaultValues: initialValues,
            mode: 'onChange',
        })

    // 폼 리셋
    useEffect(() => {
        if (open && initialValues) {
            reset(initialValues)
            if (initialValues.src) {
                setPreviewUrl(initialValues.src)
            }
        }
    }, [open, initialValues, reset])

    const handleClose = useCallback(() => {
        reset()
        setPreviewUrl(null)
        onOpenChange(false)
    }, [reset, onOpenChange])

    const handleFormSubmit = useCallback(
        async (data: ImageDialogFormValues) => {
            let src = data.src || ''

            // 파일 업로드 처리
            if (data.file && data.file.length > 0 && onUpload) {
                setIsUploading(true)
                try {
                    src = await onUpload(data.file[0])
                } catch (error) {
                    console.error('이미지 업로드 실패:', error)
                    setIsUploading(false)
                    return
                }
                setIsUploading(false)
            }

            onSubmit({
                src,
                alt: data.altText || '',
                title: data.title,
                width: data.width,
                height: data.height,
            })

            handleClose()
        },
        [onUpload, onSubmit, handleClose],
    )

    // 파일 선택 시 미리보기
    const fileList = watch('file')
    useEffect(() => {
        if (fileList && fileList.length > 0) {
            const file = fileList[0]
            const url = URL.createObjectURL(file)
            setPreviewUrl(url)
            return () => URL.revokeObjectURL(url)
        }
    }, [fileList])

    // URL 입력 시 미리보기
    const srcValue = watch('src')
    useEffect(() => {
        if (srcValue && !fileList?.length) {
            setPreviewUrl(srcValue)
        }
    }, [srcValue, fileList])

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/40" />
                <Dialog.Content
                    className="fixed left-1/2 top-1/2 z-[101] w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-white p-5 shadow-xl outline-none dark:bg-gray-900"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <Dialog.Title className="mb-4 text-lg font-semibold">
                        이미지 삽입
                    </Dialog.Title>

                    <form
                        onSubmit={handleSubmit(handleFormSubmit)}
                        className="space-y-4"
                    >
                        {/* 파일 업로드 */}
                        {onUpload && (
                            <div className="space-y-2">
                                <Label htmlFor="file">파일 업로드</Label>
                                <Input
                                    id="file"
                                    type="file"
                                    accept="image/*"
                                    {...register('file')}
                                />
                            </div>
                        )}

                        {/* URL 입력 */}
                        <div className="space-y-2">
                            <Label htmlFor="src">
                                {onUpload ? '또는 URL 입력' : '이미지 URL'}
                            </Label>
                            <Input
                                id="src"
                                placeholder="https://example.com/image.png"
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

                        {/* 미리보기 */}
                        {previewUrl && (
                            <div className="space-y-2">
                                <Label>미리보기</Label>
                                <div className="overflow-hidden rounded-lg border">
                                    <img
                                        src={previewUrl}
                                        alt="미리보기"
                                        className="max-h-48 w-full object-contain"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Alt 텍스트 & 제목 */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="altText">Alt 텍스트</Label>
                                <Input
                                    id="altText"
                                    type="text"
                                    placeholder="이미지 설명"
                                    {...register('altText')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="title">제목</Label>
                                <Input
                                    id="title"
                                    type="text"
                                    placeholder="선택 사항"
                                    {...register('title')}
                                />
                            </div>
                        </div>

                        {/* 크기 */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="width">너비</Label>
                                <Input
                                    id="width"
                                    type="number"
                                    min={0}
                                    placeholder="자동"
                                    {...register('width', {
                                        setValueAs: (v) =>
                                            v === '' || v === null ? undefined : Number(v),
                                    })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="height">높이</Label>
                                <Input
                                    id="height"
                                    type="number"
                                    min={0}
                                    placeholder="자동"
                                    {...register('height', {
                                        setValueAs: (v) =>
                                            v === '' || v === null ? undefined : Number(v),
                                    })}
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* 버튼 */}
                        <div className="flex justify-end gap-2">
                            <Button type="submit" disabled={isUploading}>
                                {isUploading ? '업로드 중...' : '삽입'}
                            </Button>
                            <Dialog.Close asChild>
                                <Button type="button" variant="outline" onClick={handleClose}>
                                    취소
                                </Button>
                            </Dialog.Close>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
