import { About } from '@/entities/about/model/types'
import { MdxRenderer } from '@/features/mdx/ui/mdx-renderer'

export function AboutDetail({ about }: { about: About }) {
  return (
    <article className="prose prose-lg dark:prose-invert mx-auto">
      <MdxRenderer content={about.content} />
    </article>
  )
}
