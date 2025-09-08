'use client'

import { MDXEditor, MDXEditorMethods } from '@mdxeditor/editor'

import { Ref, createContext, useContext, useMemo, memo } from 'react'
import '@mdxeditor/editor/style.css'
import type { PendingImageMap } from '@/features/editor/model/types'
import { makeImageHandlers } from '@/features/editor/lib/image-handlers'
import { buildPlugins } from '@/features/editor/lib/build-plugins'

type StudioEditorContextValue = {
  slug?: string
}

const StudioEditorContext = createContext<StudioEditorContextValue | null>(null)
export const useStudioEditorContext = () => useContext(StudioEditorContext)
interface Props {
  value: string
  editorRef?: Ref<MDXEditorMethods> | null
  fieldChange: (value: string) => void
  // For image path building and preview mapping
  slug?: string
  pendingImages?: PendingImageMap
  onAddPendingImage?: (path: string, file: File) => void
}
const EditorBase = ({
  value,
  editorRef,
  fieldChange,
  slug,
  pendingImages = {},
  onAddPendingImage,
}: Props) => {
  // Build image handlers for upload + preview
  const { imageUploadHandler, imagePreviewHandler } = useMemo(
    () => makeImageHandlers({ slug, pendingImages, onAddPendingImage }),
    [slug, pendingImages, onAddPendingImage],
  )

  const plugins = useMemo(
    () => buildPlugins({ imageUploadHandler, imagePreviewHandler }),
    [imageUploadHandler, imagePreviewHandler],
  )

  return (
    <StudioEditorContext.Provider value={{ slug }}>
      <MDXEditor
        markdown={value}
        ref={editorRef}
        onChange={fieldChange}
        className="prose prose-lg dark:prose-invert mx-auto w-full border border-gray-200 dark:border-gray-800"
        plugins={plugins}
      />
    </StudioEditorContext.Provider>
  )
}
const areEqual = (prev: Readonly<Props>, next: Readonly<Props>) => {
  // markdown(value) 변경은 무시하여 Editor 리렌더를 피함
  return prev.slug === next.slug && prev.pendingImages === next.pendingImages
}

export const Editor = memo(EditorBase, areEqual)
