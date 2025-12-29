/**
 * SlashCommandMenu 스토리
 *
 * 슬래시 커맨드 메뉴 컴포넌트의 Storybook 스토리입니다.
 */

import type { Meta, StoryObj } from '@storybook/react'
import { SlashCommandMenu } from './slash-command-menu'
import { SLASH_COMMAND_ITEMS } from '@/features/editor/lib/tiptap-extensions/slash-command'
import { useState } from 'react'

const meta: Meta<typeof SlashCommandMenu> = {
    title: 'features/editor/SlashCommandMenu',
    component: SlashCommandMenu,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
}

export default meta
type Story = StoryObj<typeof SlashCommandMenu>

function SlashCommandMenuDemo() {
    const [selectedItem, setSelectedItem] = useState<string | null>(null)

    return (
        <div className="relative h-96 w-80">
            <SlashCommandMenu
                items={SLASH_COMMAND_ITEMS}
                position={{ top: 0, left: 0 }}
                onSelect={(item) => setSelectedItem(item.title)}
                onClose={() => setSelectedItem(null)}
            />
            {selectedItem && (
                <div className="absolute bottom-0 left-0 right-0 rounded bg-green-100 p-2 text-sm text-green-800 dark:bg-green-900 dark:text-green-200">
                    선택됨: {selectedItem}
                </div>
            )}
        </div>
    )
}

export const Default: Story = {
    render: () => <SlashCommandMenuDemo />,
}

export const FilteredItems: Story = {
    render: () => {
        const filteredItems = SLASH_COMMAND_ITEMS.filter((item) =>
            item.title.includes('제목'),
        )

        return (
            <div className="relative h-64 w-80">
                <SlashCommandMenu
                    items={filteredItems}
                    position={{ top: 0, left: 0 }}
                    onSelect={() => { }}
                    onClose={() => { }}
                />
            </div>
        )
    },
}

export const EmptyResults: Story = {
    render: () => (
        <div className="relative h-32 w-80">
            <SlashCommandMenu
                items={[]}
                position={{ top: 0, left: 0 }}
                onSelect={() => { }}
                onClose={() => { }}
            />
        </div>
    ),
}

export const SingleItem: Story = {
    render: () => (
        <div className="relative h-32 w-80">
            <SlashCommandMenu
                items={[SLASH_COMMAND_ITEMS[0]]}
                position={{ top: 0, left: 0 }}
                onSelect={() => { }}
                onClose={() => { }}
            />
        </div>
    ),
}
