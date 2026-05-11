import type { Meta, StoryObj } from '@storybook/react'
import { CustomFigcaption } from '@/features/post/ui/custom-figcaption'

const meta: Meta<typeof CustomFigcaption> = {
  title: 'features/post/CustomFigcaption',
  component: CustomFigcaption,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
}

export default meta
type Story = StoryObj<typeof CustomFigcaption>

export const CodeBlockTitle: Story = {
  render: () => (
    <figure className="w-[560px] overflow-hidden rounded-lg bg-[#24292e]">
      <CustomFigcaption>example.tsx</CustomFigcaption>
      <pre className="m-0 overflow-x-auto px-4 py-3 text-sm text-amber-50">
        <code>{`export function Example() {
  return <p>Storybook</p>
}`}</code>
      </pre>
    </figure>
  ),
}

export const LongTitle: Story = {
  render: () => (
    <figure className="w-[560px] overflow-hidden rounded-lg bg-[#24292e]">
      <CustomFigcaption>
        app/(site)/blog/[slug]/components/storybook-long-file-name.tsx
      </CustomFigcaption>
      <pre className="m-0 overflow-x-auto px-4 py-3 text-sm text-amber-50">
        <code>{`const title = 'long file name'`}</code>
      </pre>
    </figure>
  ),
}
