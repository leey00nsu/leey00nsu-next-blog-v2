'use client'

import {
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
  DiffSourceToggleWrapper,
  type CodeBlockEditorDescriptor,
} from '@mdxeditor/editor'
import { CodeBlockWithFigcaption } from '@/features/editor/ui/codeblock-with-figcaption'
import { CustomImageDialog } from '@/features/editor/ui/custom-image-dialog'

export interface BuildPluginsParams {
  imageUploadHandler?: (file: File) => Promise<string>
  imagePreviewHandler?: (src: string) => Promise<string>
}

export function buildPlugins({
  imageUploadHandler,
  imagePreviewHandler,
}: BuildPluginsParams) {
  return [
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
  ]
}

