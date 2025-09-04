import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { cache } from 'react'
import { Post, PostMetaDataSchema } from '@/entities/post/model/types'
import lqipModern from 'lqip-modern'

const POSTS_PATH = path.join(process.cwd(), 'public/posts')

export const getPostBySlug = async (slug: string): Promise<Post | null> => {
  const fullPath = path.join(POSTS_PATH, slug, `${slug}.mdx`)

  if (!fs.existsSync(fullPath)) {
    return null
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)

  const { width, height, base64 } = await getImageMetadata(data.thumbnail)

  try {
    const frontmatter = PostMetaDataSchema.parse({
      ...data,
      date: new Date(data.date),
    })

    return {
      ...frontmatter,
      slug,
      content,
      width,
      height,
      blurDataURL: base64,
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
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

const getImageMetadata = async (thumbnailPath?: string) => {
  if (!thumbnailPath) {
    return {
      width: 0,
      height: 0,
      base64: '',
    }
  }

  const imagePath = path.join(process.cwd(), thumbnailPath)
  const imageBuffer = fs.readFileSync(imagePath)

  const { metadata } = await lqipModern(imageBuffer)
  return {
    width: metadata.originalWidth,
    height: metadata.originalHeight,
    base64: metadata.dataURIBase64,
  }
}
