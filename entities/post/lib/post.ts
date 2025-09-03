import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { cache } from 'react'
import { Post, PostMetaDataSchema } from '@/entities/post/model/types'

const POSTS_PATH = path.join(process.cwd(), 'public/posts')

export const getPostBySlug = async (slug: string): Promise<Post | null> => {
  const fullPath = path.join(POSTS_PATH, slug, `${slug}.mdx`)

  if (!fs.existsSync(fullPath)) {
    return null
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)

  try {
    const frontmatter = PostMetaDataSchema.parse({
      ...data,
      date: new Date(data.date),
    })

    return {
      ...frontmatter,
      slug,
      content,
    }
  } catch (error) {
    console.error(`Error parsing frontmatter for ${slug}:`, error)
    return null
  }
}

export const getAllPosts = cache(async (): Promise<Post[]> => {
  if (!fs.existsSync(POSTS_PATH)) {
    return []
  }

  const slugs = fs
    .readdirSync(POSTS_PATH, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)

  const posts = await Promise.all(
    slugs.map(async (slug) => {
      const post = await getPostBySlug(slug)
      if (!post || post.draft) return null
      return post
    }),
  )

  return posts
    .filter((post): post is Post => post !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
})
