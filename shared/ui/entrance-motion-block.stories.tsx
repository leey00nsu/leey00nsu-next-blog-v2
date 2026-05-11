import type { Meta, StoryObj } from '@storybook/react'
import { EntranceMotionBlock } from '@/shared/ui/entrance-motion-block'

const meta: Meta<typeof EntranceMotionBlock> = {
  title: 'shared/EntranceMotionBlock',
  component: EntranceMotionBlock,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
}

export default meta
type Story = StoryObj<typeof EntranceMotionBlock>

export const Default: Story = {
  args: {
    delaySeconds: 0,
  },
  render: (args) => (
    <EntranceMotionBlock {...args} className="w-80 rounded-lg border p-5">
      <h3 className="font-semibold">Animated content</h3>
      <p className="text-muted-foreground mt-2 text-sm">
        This block uses the shared entrance animation.
      </p>
    </EntranceMotionBlock>
  ),
}

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  render: (args) => (
    <EntranceMotionBlock {...args} className="w-80 rounded-lg border p-5">
      <h3 className="font-semibold">Static content</h3>
      <p className="text-muted-foreground mt-2 text-sm">
        The wrapper renders without motion when disabled.
      </p>
    </EntranceMotionBlock>
  ),
}

