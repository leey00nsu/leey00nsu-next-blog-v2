import type { Meta, StoryObj } from '@storybook/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'

const meta: Meta<typeof Tabs> = {
  title: 'shared/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
}

export default meta
type Story = StoryObj<typeof Tabs>

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-[420px]">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <div className="rounded-md border p-4 text-sm">
          Overview content keeps the default tab selected.
        </div>
      </TabsContent>
      <TabsContent value="details">
        <div className="rounded-md border p-4 text-sm">
          Details content appears after selecting the second tab.
        </div>
      </TabsContent>
      <TabsContent value="settings">
        <div className="rounded-md border p-4 text-sm">
          Settings content appears after selecting the third tab.
        </div>
      </TabsContent>
    </Tabs>
  ),
}

