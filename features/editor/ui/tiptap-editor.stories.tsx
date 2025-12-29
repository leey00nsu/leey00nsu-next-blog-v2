/**
 * TiptapEditor 스토리
 *
 * Tiptap 기반 에디터 컴포넌트의 Storybook 스토리입니다.
 */

import type { Meta, StoryObj } from '@storybook/react'
import { TiptapEditor } from './tiptap-editor'
import { useState } from 'react'

const meta: Meta<typeof TiptapEditor> = {
    title: 'features/editor/TiptapEditor',
    component: TiptapEditor,
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
    },
    decorators: [
        (Story) => (
            <div className="mx-auto max-w-4xl">
                <Story />
            </div>
        ),
    ],
}

export default meta
type Story = StoryObj<typeof TiptapEditor>

function TiptapEditorWithState(props: { initialValue?: string }) {
    const [value, setValue] = useState(props.initialValue ?? '')

    return (
        <div className="space-y-4">
            <TiptapEditor value={value} fieldChange={setValue} />
            <details className="rounded border p-2">
                <summary className="cursor-pointer text-sm text-gray-500">
                    MDX 출력 보기
                </summary>
                <pre className="mt-2 max-h-60 overflow-auto rounded bg-gray-100 p-2 text-xs dark:bg-gray-800">
                    {value || '(빈 문서)'}
                </pre>
            </details>
        </div>
    )
}

export const Default: Story = {
    render: () => <TiptapEditorWithState />,
}

export const WithInitialContent: Story = {
    render: () => (
        <TiptapEditorWithState
            initialValue={`# 제목 1

이것은 **굵은 텍스트**와 *기울임 텍스트*가 포함된 문단입니다.

## 제목 2

- 목록 항목 1
- 목록 항목 2
- 목록 항목 3

### 제목 3

> 인용문 예시입니다.

\`\`\`typescript title="example.ts"
const greeting = "Hello, World!";
console.log(greeting);
\`\`\`
`}
        />
    ),
}

export const WithCodeBlock: Story = {
    render: () => (
        <TiptapEditorWithState
            initialValue={`# 코드 예시

다양한 언어의 코드블록을 지원합니다.

\`\`\`javascript title="hello.js"
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

\`\`\`python title="hello.py"
def greet(name):
    return f"Hello, {name}!"
\`\`\`

\`\`\`css title="styles.css"
.container {
  display: flex;
  justify-content: center;
}
\`\`\`
`}
        />
    ),
}

export const WithImage: Story = {
    render: () => (
        <TiptapEditorWithState
            initialValue={`# 이미지 예시

아래는 이미지 예시입니다.

![샘플 이미지](https://via.placeholder.com/600x400)

이미지 아래에 텍스트가 있습니다.
`}
        />
    ),
}

export const WithTable: Story = {
    render: () => (
        <TiptapEditorWithState
            initialValue={`# 테이블 예시

| 이름 | 나이 | 직업 |
|------|------|------|
| 홍길동 | 30 | 개발자 |
| 김철수 | 25 | 디자이너 |
| 이영희 | 28 | 기획자 |
`}
        />
    ),
}

export const Empty: Story = {
    render: () => <TiptapEditorWithState initialValue="" />,
}
