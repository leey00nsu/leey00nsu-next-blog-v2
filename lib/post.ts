import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { z } from 'zod'
import { cache } from 'react'

const postSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  date: z.date(),
  tags: z.array(z.string()),
})

export type Post = z.infer<typeof postSchema> & {
  content: string
}

const POSTS_PATH = path.join(process.cwd(), 'public/posts')

export const getPostBySlug = async (slug: string): Promise<Post | null> => {
  const fullPath = path.join(POSTS_PATH, slug, `${slug}.mdx`)

  if (!fs.existsSync(fullPath)) {
    return null
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)

  try {
    const frontmatter = postSchema.parse({
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

export const getAllPosts = cache(async (): Promise<Omit<Post, 'content'>[]> => {
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
      if (!post) return null
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { content, ...meta } = post
      return meta
    }),
  )

  return posts
    .filter((post): post is Omit<Post, 'content'> => post !== null)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
})
