import Image from 'next/image'
import Link from 'next/link'
import { FOOTER } from '@/shared/config/constants'

export function Footer() {
  const description =
    process.env.NEXT_PUBLIC_FOOTER_DESCRIPTION ?? FOOTER.DEFAULT_DESCRIPTION
  const githubId = process.env.NEXT_PUBLIC_GITHUB_ID || ''

  const hasGithub = Boolean(githubId)

  return (
    <footer className="text-muted-foreground z-50 border-t p-4 text-sm">
      <div className="flex items-center justify-center gap-4">
        <p className="line-clamp-2 break-words">{description}</p>
        <div className="flex items-center gap-3">
          {hasGithub && (
            <Link
              href={`https://github.com/${githubId}`}
              aria-label="GitHub profile"
              target="_blank"
              rel="noreferrer noopener"
              className="hover:text-primary"
              title="GitHub"
            >
              <Image
                src="/github-mark.svg"
                alt="GitHub"
                width={24}
                height={24}
                className="dark:invert"
              />
            </Link>
          )}
        </div>
      </div>
    </footer>
  )
}
