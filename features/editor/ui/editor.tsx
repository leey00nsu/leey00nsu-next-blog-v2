'use client'

import {
  MDXEditor,
  UndoRedo,
  BoldItalicUnderlineToggles,
  toolbarPlugin,
  CodeToggle,
  InsertCodeBlock,
  codeBlockPlugin,
  headingsPlugin,
  listsPlugin,
  linkPlugin,
  quotePlugin,
  markdownShortcutPlugin,
  ListsToggle,
  linkDialogPlugin,
  CreateLink,
  InsertImage,
  InsertTable,
  tablePlugin,
  imagePlugin,
  codeMirrorPlugin,
  ConditionalContents,
  ChangeCodeMirrorLanguage,
  Separator,
  InsertThematicBreak,
  diffSourcePlugin,
  MDXEditorMethods,
  DiffSourceToggleWrapper,
  type CodeBlockEditorDescriptor,
} from '@mdxeditor/editor'

import { Ref, createContext, useContext, useMemo, memo } from 'react'
import '@mdxeditor/editor/style.css'
import { CodeBlockWithFigcaption } from '@/features/editor/ui/codeblock-with-figcaption'
import { CustomImageDialog } from '@/features/editor/ui/custom-image-dialog'
import type { PendingImageMap } from '@/features/editor/model/types'
import { makeImageHandlers } from '@/features/editor/lib/image-handlers'

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
    () => [
      headingsPlugin(),
      listsPlugin(),
      linkPlugin(),
      linkDialogPlugin(),
      quotePlugin(),
      markdownShortcutPlugin(),
      tablePlugin(),
      imagePlugin({
        imageUploadHandler,
        imagePreviewHandler,
        ImageDialog: CustomImageDialog,
        allowSetImageDimensions: true,
      }),
      codeBlockPlugin({
        defaultCodeBlockLanguage: '',
        codeBlockEditorDescriptors: [
          {
            priority: 100,
            match: () => true,
            Editor: CodeBlockWithFigcaption,
          } satisfies CodeBlockEditorDescriptor,
        ],
      }),
      codeMirrorPlugin({
        codeBlockLanguages: {
          css: 'css',
          txt: 'txt',
          sql: 'sql',
          html: 'html',
          sass: 'sass',
          scss: 'scss',
          bash: 'bash',
          json: 'json',
          js: 'javascript',
          ts: 'typescript',
          '': 'unspecified',
          tsx: 'TypeScript (React)',
          jsx: 'JavaScript (React)',
        },
        autoLoadLanguageSupport: true,
      }),
      diffSourcePlugin({ viewMode: 'rich-text', diffMarkdown: '' }),
      toolbarPlugin({
        toolbarContents: () => (
          <DiffSourceToggleWrapper options={['rich-text', 'source']}>
            <ConditionalContents
              options={[
                {
                  when: (editor) => editor?.editorType === 'codeblock',
                  contents: () => <ChangeCodeMirrorLanguage />,
                },
                {
                  fallback: () => (
                    <>
                      <UndoRedo />
                      <Separator />
                      <BoldItalicUnderlineToggles />
                      <CodeToggle />
                      <Separator />
                      <ListsToggle />
                      <Separator />
                      <CreateLink />
                      <InsertImage />
                      <Separator />
                      <InsertTable />
                      <InsertThematicBreak />
                      <Separator />
                      <InsertCodeBlock />
                    </>
                  ),
                },
              ]}
            />
          </DiffSourceToggleWrapper>
        ),
      }),
    ],
    [imageUploadHandler, imagePreviewHandler],
  )

  return (
    <StudioEditorContext.Provider value={{ slug }}>
      <MDXEditor
        markdown={value}
        ref={editorRef}
        onChange={fieldChange}
        className="prose prose-lg dark:prose-invert mx-auto border border-gray-200 dark:border-gray-800"
        plugins={plugins}
      />
    </StudioEditorContext.Provider>
  )
}
const areEqual = (prev: Readonly<Props>, next: Readonly<Props>) => {
  // markdown(value) 변경은 무시하여 Editor 리렌더를 피함
  return prev.slug === next.slug && prev.pendingImages === next.pendingImages
}

const Editor = memo(EditorBase, areEqual)
export default Editor
