import type { Meta, StoryObj } from '@storybook/react'
import { CustomImage } from '@/shared/ui/custom-image'

const meta: Meta<typeof CustomImage> = {
  title: 'shared/CustomImage',
  component: CustomImage,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
}

export default meta
type Story = StoryObj<typeof CustomImage>

export const Default: Story = {
  args: {
    src: '/logo.webp',
    alt: 'Blog logo',
    width: 320,
    height: 320,
  },
  render: (args) => (
    <div className="w-64">
      <CustomImage {...args} />
    </div>
  ),
}

export const WithBlurPlaceholder: Story = {
  args: {
    src: '/logo.webp',
    alt: 'Blog logo',
    width: 320,
    height: 320,
    base64:
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjMyMCIgdmlld0JveD0iMCAwIDMyMCAzMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMyMCIgaGVpZ2h0PSIzMjAiIGZpbGw9IiNlNWU3ZWIiLz48L3N2Zz4=',
  },
  render: (args) => (
    <div className="w-64">
      <CustomImage {...args} />
    </div>
  ),
}

export const ExternalFallback: Story = {
  args: {
    src: 'https://placehold.co/640x360',
    alt: 'External placeholder',
  },
  render: (args) => (
    <div className="w-80">
      <CustomImage {...args} />
    </div>
  ),
}

