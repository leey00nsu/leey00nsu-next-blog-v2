import type { Meta, StoryObj } from '@storybook/react'
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

const noop = () => { }

export const KoreanToEnglish: Story = {
    render: () => (
        <NextIntlClientProvider locale="en" messages={messages}>
            <LanguageSelector
                sourceLocale="ko"
                onSourceChange={noop}
                targetLocales={['en']}
                onTargetsChange={noop}
            />
        </NextIntlClientProvider>
    ),
}

export const EnglishToKorean: Story = {
    render: () => (
        <NextIntlClientProvider locale="en" messages={messages}>
            <LanguageSelector
                sourceLocale="en"
                onSourceChange={noop}
                targetLocales={['ko']}
                onTargetsChange={noop}
            />
        </NextIntlClientProvider>
    ),
}

export const AllTargetsSelected: Story = {
    render: () => (
        <NextIntlClientProvider locale="en" messages={messages}>
            <LanguageSelector
                sourceLocale="ko"
                onSourceChange={noop}
                targetLocales={['ko', 'en']}
                onTargetsChange={noop}
            />
        </NextIntlClientProvider>
    ),
}
