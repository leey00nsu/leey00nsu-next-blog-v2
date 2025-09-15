'use client'

import { LOCALES, type SupportedLocale } from '@/shared/config/constants'
import { Checkbox } from '@/shared/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { useTranslations } from 'next-intl'

interface LanguageSelectorProps {
  className?: string
  sourceLocale: SupportedLocale | string
  onSourceChange: (next: SupportedLocale) => void
  targetLocales: (SupportedLocale | string)[]
  onTargetsChange: (next: SupportedLocale[]) => void
}

export function LanguageSelector({
  className,
  sourceLocale,
  onSourceChange,
  targetLocales,
  onTargetsChange,
}: LanguageSelectorProps) {
  const t = useTranslations('studio.language')
  const supported = [...LOCALES.SUPPORTED]
  const selected = new Set(targetLocales.map(String))

  const handleToggle = (loc: SupportedLocale, checked: boolean) => {
    const next = new Set(selected)
    if (checked) next.add(loc)
    else next.delete(loc)
    onTargetsChange([...next] as SupportedLocale[])
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="studio-source-locale"
            className="mb-1 block text-sm font-medium"
          >
            {t('source')}
          </label>
          <Select
            value={String(sourceLocale)}
            onValueChange={(v) => onSourceChange(v as SupportedLocale)}
          >
            <SelectTrigger id="studio-source-locale">
              <SelectValue placeholder={t('selectPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {supported.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {t(`labels.${loc}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="mb-1 text-sm font-medium">{t('targets')}</div>
          <div className="flex flex-wrap gap-3">
            {supported.map((loc) => {
              const checked = selected.has(loc)
              return (
                <label
                  key={loc}
                  className="inline-flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => handleToggle(loc, Boolean(v))}
                    aria-label={t(`labels.${loc}`)}
                  />
                  <span>{t(`labels.${loc}`)}</span>
                </label>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
