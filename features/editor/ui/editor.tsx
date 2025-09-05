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

import { Ref } from 'react'
import '@mdxeditor/editor/style.css'
import { CodeBlockWithFigcaption } from '@/features/editor/ui/codeblock-with-figcaption'
interface Props {
  value: string
  editorRef?: Ref<MDXEditorMethods> | null
  fieldChange: (value: string) => void
}
const Editor = ({ value, editorRef, fieldChange }: Props) => {
  return (
    <MDXEditor
      markdown={value}
      ref={editorRef}
      onChange={fieldChange}
      className="prose prose-lg dark:prose-invert mx-auto border border-gray-200 dark:border-gray-800"
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        quotePlugin(),
        markdownShortcutPlugin(),
        tablePlugin(),
        imagePlugin(),
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
      ]}
    />
  )
}
export default Editor
