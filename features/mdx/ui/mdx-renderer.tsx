import { MDXRemote } from 'next-mdx-remote/rsc'
import {
  defaultRemarkPlugins,
  defaultRehypePlugins,
} from '@/features/mdx/lib/mdx-options'
import { CustomFigcaption } from '@/features/post/ui/custom-figcaption'
import CustomImage from '@/features/post/ui/custom-image'
import type React from 'react'

type MDXRemoteProps = React.ComponentProps<typeof MDXRemote>
type MDXComponentMap = Record<string, React.ComponentType<unknown>>
type PluginList = NonNullable<
  NonNullable<
    NonNullable<MDXRemoteProps['options']>['mdxOptions']
  >['remarkPlugins']
>

interface MdxRendererProps {
  content: string
  components?: MDXComponentMap
  remarkPlugins?: PluginList
  rehypePlugins?: PluginList
}

export function MdxRenderer({
  content,
  components,
  remarkPlugins,
  rehypePlugins,
}: MdxRendererProps) {
  return (
    <MDXRemote
      source={content}
      components={{
        figcaption: CustomFigcaption,
        img: CustomImage,
        ...components,
      }}
      options={{
        mdxOptions: {
          remarkPlugins: (remarkPlugins ??
            defaultRemarkPlugins) as unknown as PluginList,
          rehypePlugins: (rehypePlugins ??
            defaultRehypePlugins) as unknown as PluginList,
        },
      }}
    />
  )
}
