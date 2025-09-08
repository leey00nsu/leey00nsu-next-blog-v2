import Link from 'next/link'

export async function Header() {
  return (
    <header className="bg-background sticky top-0 z-50">
      <div className="flex h-16 items-center justify-center gap-8">
        <Link href="/blog" className="hover:text-primary">
          Blog
        </Link>
        <Link href="/about" className="hover:text-primary">
          About
        </Link>

        <Link href="/studio" className="hover:text-primary">
          Studio
        </Link>
      </div>
    </header>
  )
}
