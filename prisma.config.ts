import { defineConfig } from 'prisma/config'
import './shared/lib/load-node-environment'

// Prisma CLI requires a default export for its configuration.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url:
      process.env.PRISMA_DATABASE_URL ??
      process.env.BLOG_CHAT_RAG_DATABASE_URL ??
      process.env.DATABASE_URL,
  },
})
