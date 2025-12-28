import type { Meta, StoryObj } from '@storybook/react'
import { action } from '@storybook/addon-actions'
import { LanguageSelector } from './language-selector'
import { NextIntlClientProvider } from 'next-intl'
import { useState } from 'react'
import type { SupportedLocale } from '@/shared/config/constants'

const messages = {
    studio: {
        language: {
            source: 'Source Language',
            targets: 'Target Languages',
            selectPlaceholder: 'Select language',
            labels: {
                ko: '한국어',
                en: 'English',
            },
        },
    },
}

function LanguageSelectorDemo() {
    const [sourceLocale, setSourceLocale] = useState<SupportedLocale>('ko')
    const [targetLocales, setTargetLocales] = useState<SupportedLocale[]>(['en'])

    return (
        <NextIntlClientProvider locale="en" messages={messages}>
            <LanguageSelector
                sourceLocale={sourceLocale}
                onSourceChange={setSourceLocale}
                targetLocales={targetLocales}
                onTargetsChange={setTargetLocales}
            />
        </NextIntlClientProvider>
    )
}

const meta: Meta<typeof LanguageSelector> = {
    title: 'features/LanguageSelector',
    component: LanguageSelector,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
}

export default meta
type Story = StoryObj<typeof LanguageSelector>

export const Default: Story = {
    render: () => <LanguageSelectorDemo />,
}

export const KoreanToEnglish: Story = {
    render: () => (
        <NextIntlClientProvider locale="en" messages={messages}>
            <LanguageSelector
                sourceLocale="ko"
                onSourceChange={action('onSourceChange')}
                targetLocales={['en']}
                onTargetsChange={action('onTargetsChange')}
            />
        </NextIntlClientProvider>
    ),
}

export const EnglishToKorean: Story = {
    render: () => (
        <NextIntlClientProvider locale="en" messages={messages}>
            <LanguageSelector
                sourceLocale="en"
                onSourceChange={action('onSourceChange')}
                targetLocales={['ko']}
                onTargetsChange={action('onTargetsChange')}
            />
        </NextIntlClientProvider>
    ),
}

export const AllTargetsSelected: Story = {
    render: () => (
        <NextIntlClientProvider locale="en" messages={messages}>
            <LanguageSelector
                sourceLocale="ko"
                onSourceChange={action('onSourceChange')}
                targetLocales={['ko', 'en']}
                onTargetsChange={action('onTargetsChange')}
            />
        </NextIntlClientProvider>
    ),
}
