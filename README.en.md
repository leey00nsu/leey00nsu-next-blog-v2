![leey00nsu-next-blog-v2 Logo](./public/logo.webp)

<h1 align="center">
  <strong>leey00nsu-next-blog-v2</strong>
</h1>

<p align="center">
  <strong>Next.js-based personal blog with MDX multi-language support, in-browser Studio editor, and GitHub auto commit</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D18.18-brightgreen" alt="Node.js">
  <a href="https://leey00nsu.com"><img src="https://img.shields.io/badge/demo-live-blue" alt="Demo"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="https://leey00nsu.com">Demo</a>
</p>

<p align="center">
  <a href="./README.en.md">
    <img src="https://img.shields.io/badge/lang-en-red.svg" alt="English">
  </a>
  <a href="./README.md">
    <img src="https://img.shields.io/badge/lang-ko-blue.svg" alt="한국어">
  </a>
</p>

---

## Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation & Setup](#installation--setup)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## Quick Start

```bash
# 1. Clone repository and install dependencies
git clone https://github.com/leey00nsu/leey00nsu-next-blog-v2 && cd leey00nsu-next-blog-v2 && pnpm install

# 2. Set up environment variables
cp .env.example .env.local  # Edit environment variables

# 3. Install Playwright (for PDF generation, first run only)
pnpm playwright:install

# 4. Start development server
pnpm dev
```

→ Open the local URL printed by the development server

## Features

### 📝 Blog

- MDX rendering: GFM, line breaks, code highlighting, auto-injected image metadata (width/height, LQIP)
- Auto-generated Table of Contents (ToC)
- Giscus comment system

### ✏️ Studio Editor

- Tiptap-based Notion-style editor
- Frontmatter/body editing, image upload & preview
- Automatic image path remapping on slug changes
- Auto-commit MDX/images to GitHub branch

### 🌐 Internationalization (i18n)

- `next-intl` based Korean/English support
- Per-locale MDX file structure: `{slug}.{locale}.mdx`
- OpenAI-powered translation automation

### 🤖 AI Features

- Select text in editor to generate AI images
- Adapter pattern for various providers
- Blog Q&A chatbot
  - Converts MDX into lexical search records at build time and refreshes a Postgres (`pgvector`) RAG index after deployment
  - Routes questions first so greetings, chatbot identity, contact, latest/oldest post, and current-post questions use a direct path
  - Uses lexical search and curated sources (profile/project/internal assistant docs) first for normal grounded questions
  - Uses Postgres embedding RAG first for whole-blog synthesis questions
  - Validates citations and refuses when evidence is weak

### 📄 PDF Export

- Render `/print/resume` via Playwright
- Download About + project details as a single portfolio PDF

### 🔐 Authentication

- GitHub OAuth (NextAuth v5)
- Studio access limited to allowlisted users

## Tech Stack

| Area              | Technology                                      |
| ----------------- | ----------------------------------------------- |
| **Framework**     | Next.js 16.1.1 (App Router), React 19.1.0       |
| **Styling**       | Tailwind CSS 4, shadcn/ui                       |
| **MDX**           | next-mdx-remote, remark-gfm, rehype-pretty-code |
| **i18n**          | next-intl v4                                    |
| **Editor**        | Tiptap (Notion-style)                           |
| **Auth**          | next-auth@5 (GitHub Provider)                   |
| **AI/Automation** | OpenAI API, AI SDK, LangGraph.js, PostgreSQL (`pgvector`), Modal, Octokit |
| **Image**         | sharp, lqip-modern                              |
| **Test**          | Vitest, Playwright, Storybook 10                |
| **DevOps**        | ESLint 9, Prettier, Husky, lint-staged          |

## Installation & Setup

### Prerequisites

- Node.js 18.18+ (Recommended: Node.js 20 LTS)
- pnpm installed
- GitHub OAuth App, GitHub Personal Access Token, OpenAI API Key

### Installation

```bash
# Clone repository
git clone https://github.com/leey00nsu/leey00nsu-next-blog-v2
cd leey00nsu-next-blog-v2

# Install dependencies
pnpm install
```

### Environment Variables

Copy `.env.example` to create `.env.local` and set the values:

```bash
cp .env.example .env.local
```

Use **[.env.example](./.env.example)** as the single source of truth for exact variable names, defaults, and comments.

The most important groups are:

- Auth.js / GitHub OAuth
- GitHub auto-commit token
- OpenAI translation / chat / router model settings
- Modal embedding endpoint and proxy auth
- Postgres Chat RAG connection settings
- Blog chat limits such as top-k, minimum lexical score, input length, daily quota, and cache TTL

### Setup Tips

- **GitHub OAuth**: Set Authorization callback URL to `NEXT_PUBLIC_APP_URL/api/auth/callback/github`
- **Giscus**: Get repoId and categoryId from https://giscus.app
- **GitHub Token**: Use a token with push permission to your repository

### Running

```bash
# Development server
pnpm dev

# Postgres RAG indexing (optional for local semantic search)
pnpm run gen:chat-rag-postgres

# Production build/run
pnpm build
pnpm start

# Docker/Coolify build command
pnpm install && pnpm exec playwright install --with-deps chromium && pnpm run build
```

> The `postbuild` step starts a temporary server to auto-generate PDFs.  
> Playwright Chromium must be installed before building.

### Run Local Postgres (`pgvector`)

To test the full RAG flow locally, start Postgres first.

`docker compose` reads the root `.env` file by default. If you use compose locally, keep `.env.example` mirrored into `.env` or your local environment file.

```bash
docker compose -f docker-compose.postgres.yml up -d
```

The defaults match `.env.example`, and you can override them with these keys.

```env
BLOG_CHAT_RAG_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/leey00nsu_blog
BLOG_CHAT_RAG_POSTGRES_DB=leey00nsu_blog
BLOG_CHAT_RAG_POSTGRES_USER=postgres
BLOG_CHAT_RAG_POSTGRES_PASSWORD=postgres
BLOG_CHAT_RAG_POSTGRES_PORT=5432
```

Only after Postgres is running should you run:

```bash
pnpm run gen:chat-rag-postgres
```

### Chat Index Generation

- The following deterministic scripts run automatically in `predev` and `prebuild`
  - `pnpm run gen:posts`
  - `pnpm run gen:projects`
  - `pnpm run gen:chat-semantic`
  - `pnpm run gen:blog-search`
- Instead of crawling `.next` HTML output, this project generates **lexical search records and Postgres RAG input data directly from source MDX**.
- `gen:blog-search` generates `entities/post/config/blog-search-records.generated.ts`.
- `gen:chat-rag-postgres` writes a new Postgres RAG `index_version` from lexical and curated sources and only activates it at the end.
- If the embedding provider or Postgres connection is not configured, Postgres RAG indexing is skipped and lexical retrieval still works.

### Coolify / CI-CD Notes

- Make sure the Coolify PostgreSQL service has the `pgvector` extension enabled.
- Do not put `gen:chat-rag-postgres` inside `pnpm build`.
- The recommended flow is:
  1. Coolify detects the Git push and deploys the new application image
  2. **Post-deployment Command** runs `pnpm run gen:chat-rag-postgres`
  3. Only after the full index build succeeds does Postgres switch the active `index_version`
- This keeps the previous active index intact when re-indexing fails.
- In production you should at least provide:
  - `BLOG_CHAT_RAG_DATABASE_URL`
  - `MODAL_EMBEDDING_BASE_URL`
  - `MODAL_EMBEDDING_KEY`
  - `MODAL_EMBEDDING_SECRET`

## Usage

### Browse Blog

Open `http://localhost:3000/blog` in your browser

### Use Blog Q&A

- Click the `Blog Q&A` button at the bottom-right of blog list/detail pages
- The server routes the question first
- Greetings, chatbot identity, contact, latest/oldest post, and current-post questions use a direct path
- Normal grounded questions search both build-generated lexical records and curated sources
- Whole-blog synthesis questions use Postgres RAG first
- Normal grounded questions fall back to Postgres RAG when lexical retrieval is weak
- The model cannot browse, search externally, or call tools
- Cache keys use the normalized question so repeated requests cost less
- To protect the free API, the default policy limits each question to 200 characters and the whole service to 100 questions per day in KST

### Write/Commit via Studio

1. Sign in with GitHub (allowlisted users only)
2. Navigate to `/studio`
3. Fill in frontmatter (required: `slug`, `title`, `description`, `writer`, `section`, `date`, `tags`)
4. Write MDX content and upload images
5. Select source/target locales (e.g., source=ko, targets=ko,en)
6. Save → Translate via OpenAI (targets) → Commit MDX/images to GitHub branch

Result: `public/posts/{slug}/{slug}.{locale}.mdx` and images in the same folder

### AI Image Generation

1. Select text you want to convert to an image in the editor
2. Click AI menu (✨) → Select **Generate Image**
3. Generated image is automatically inserted after the selected text

> Prerequisite: `LEESFIELD_API_KEY` environment variable required

### Batch MDX Translation Script

```bash
# Defaults: source=LOCALES.DEFAULT, targets=LOCALES.SUPPORTED
pnpm gen:mdx-i18n

# With arguments
pnpm gen:mdx-i18n --source=ko --targets=en

# With environment variables
MDX_I18N_SOURCE=ko MDX_I18N_TARGETS=en pnpm gen:mdx-i18n
```

Scans `public/posts/{slug}` and `public/about` to create missing locale MDX files.

### Download About + Project PDF

- Click the `Download PDF` button at the top of `/about` page
- PDFs are auto-generated at build time (`postbuild`) and saved to `public/pdf/portfolio-{locale}.pdf`

### Blog Q&A Safety Constraints

- Search is fully server-controlled. The model cannot search, browse, edit files, or call tools.
- The LLM is not called when retrieval quality is weak.
- Only top-k evidence snippets are sent to reduce token cost.
- Model output is constrained with a JSON schema.
- The server validates that returned citation URLs exist in the retrieved result set.
- If validation fails, the endpoint returns a safe refusal instead of the answer.

### Future Extensions

- The current system uses lexical retrieval plus a Pagefind index.
- Reranking, query rewrite, embedding, or vector DB can be added later if needed.
- For now, the implementation intentionally avoids vector DBs, embeddings, and managed RAG.

## Project Structure

This project follows **FSD (Feature-Sliced Design)**.  
See [AGENTS.md](./AGENTS.md) for detailed rules.

```
leey00nsu-next-blog-v2/
├── app/             # Next.js App Router (routing, layout, API routes)
├── widgets/         # Page sections composed of multiple features/entities
├── features/        # User action units (auth, editor, i18n, mdx, pdf, post, studio)
├── entities/        # Domain objects (about, editor, post, project, studio)
├── shared/          # Shared UI/utils/config (no domain knowledge)
├── lib/             # Server-side shared logic
├── i18n/            # next-intl routing configuration
├── messages/        # next-intl translation messages (ko/en)
├── scripts/         # Node scripts (MDX i18n, PDF generation, etc.)
├── public/          # Static files and MDX posts (with images)
├── e2e/             # Playwright E2E tests
└── views/           # View-related files
```

**FSD Dependency Flow**: `shared → entities → features → widgets → app`

## Testing

```bash
# Unit tests
pnpm test

# Single test run
pnpm test:run

# With coverage
pnpm test:coverage

# E2E tests
pnpm test:e2e

# E2E UI mode
pnpm test:e2e:ui
```

Test structure:

- `e2e/` - Playwright E2E tests
- `**/*.test.ts` - Vitest unit tests
- `**/*.stories.tsx` - Storybook component documentation

## Troubleshooting

<details>
<summary><strong>Playwright Installation Error</strong></summary>

```bash
# Manual Chromium installation
pnpm playwright:install

# Or install all browsers with dependencies
pnpm exec playwright install --with-deps
```

</details>

<details>
<summary><strong>PDF Generation Failure During Build</strong></summary>

- Verify Playwright Chromium is installed
- Set `PLAYWRIGHT_EXECUTABLE_PATH` environment variable if needed
- In Docker environments, use `--with-deps` option to install dependencies

</details>

<details>
<summary><strong>GitHub Commit Failure</strong></summary>

- Verify `GITHUB_TOKEN` has push permission for the repository
- Check `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH` values

</details>

<details>
<summary><strong>OpenAI Translation Error</strong></summary>

- Verify `OPENAI_API_KEY` is valid
- Check API usage limits

</details>

## Contributing

1. Fork → Create branch → Develop → Pull Request

## License

[MIT License](./LICENSE)

---
