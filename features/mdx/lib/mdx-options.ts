import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeSlug from 'rehype-slug'
import rehypePrettyCode from 'rehype-pretty-code'

import remarkRemovePublic from '@/features/mdx/lib/remark-remove-public'
import imageMetadata from '@/features/mdx/lib/image-metadata'

export const defaultRemarkPlugins = [remarkGfm, remarkBreaks, remarkRemovePublic]

export const defaultRehypePlugins = [
  [
    rehypePrettyCode,
    {
      theme: 'github-dark',
    },
  ],
  rehypeSlug,
  imageMetadata,
]

