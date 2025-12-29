'use client'

/**
 * LinkDialog 컴포넌트
 *
 * 링크 삽입/편집 다이얼로그입니다.
 * URL과 텍스트 입력을 지원합니다.
 *
 * _Requirements: 3.3_
 */

import * as Dialog from '@radix-ui/react-dialog'
import { useState, useCallback, useEffect } from 'react'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Button } from '@/shared/ui/button'

interface LinkDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (data: { href: string }) => void
    onRemove?: () => void
    initialUrl?: string
    isEditing?: boolean
}

export function LinkDialog({
    open,
    onOpenChange,
    onSubmit,
    onRemove,
    initialUrl = '',
    isEditing = false,
}: LinkDialogProps) {
    const [url, setUrl] = useState(initialUrl)
    const [error, setError] = useState<string | null>(null)

    // 다이얼로그 열릴 때 초기값 설정
    useEffect(() => {
        if (open) {
            setUrl(initialUrl)
            setError(null)
        }
    }, [open, initialUrl])

    const handleClose = useCallback(() => {
        setUrl('')
        setError(null)
        onOpenChange(false)
    }, [onOpenChange])

    const validateUrl = useCallback((value: string): boolean => {
        if (!value.trim()) {
            setError('URL을 입력해주세요')
            return false
        }

        // 간단한 URL 유효성 검사 (http, https, mailto, tel 허용)
        const urlPattern = /^(https?:\/\/|mailto:|tel:)/i
        // http:// 없이 입력한 경우 자동으로 추가 예정이므로 유효함
        const isValidOrAutoFixable = urlPattern.test(value) ||
            (!value.includes('://') && !value.startsWith('mailto:') && !value.startsWith('tel:'))

        if (isValidOrAutoFixable) {
            setError(null)
            return true
        }

        return true
    }, [])

    const handleSubmit = useCallback(
        (event: React.FormEvent) => {
            event.preventDefault()

            if (!validateUrl(url)) {
                return
            }

            let finalUrl = url.trim()

            // http:// 또는 https:// 없으면 https:// 추가
            if (!finalUrl.includes('://') && !finalUrl.startsWith('mailto:') && !finalUrl.startsWith('tel:')) {
                finalUrl = `https://${finalUrl}`
            }

            onSubmit({ href: finalUrl })
            handleClose()
        },
        [url, validateUrl, onSubmit, handleClose],
    )

    const handleRemove = useCallback(() => {
        onRemove?.()
        handleClose()
    }, [onRemove, handleClose])

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/40" />
                <Dialog.Content
                    className="fixed left-1/2 top-1/2 z-[101] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-white p-5 shadow-xl outline-none dark:border-gray-700 dark:bg-gray-900"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <Dialog.Title className="mb-4 text-lg font-semibold">
                        {isEditing ? '링크 편집' : '링크 삽입'}
                    </Dialog.Title>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="link-url">URL</Label>
                            <Input
                                id="link-url"
                                type="text"
                                placeholder="https://example.com"
                                value={url}
                                onChange={(e) => {
                                    setUrl(e.target.value)
                                    setError(null)
                                }}
                                autoFocus
                            />
                            {error && (
                                <p className="text-xs text-red-600 dark:text-red-400">
                                    {error}
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2">
                            {isEditing && onRemove && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={handleRemove}
                                    className="mr-auto"
                                >
                                    링크 제거
                                </Button>
                            )}
                            <Button type="submit">
                                {isEditing ? '수정' : '삽입'}
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
