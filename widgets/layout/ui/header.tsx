import Link from 'next/link'

export function Header() {
  return (
    <header className="bg-background sticky top-0 z-50">
      <div className="flex h-16 items-center justify-evenly">
        <Link href="/blog" className="hover:text-primary">
          Blog
        </Link>
        <Link href="/about" className="hover:text-primary">
          About
        </Link>
        <Link href="/contact" className="hover:text-primary">
          Contact
        </Link>
      </div>
    </header>
  )
}
