# leey00nsu-next-blog-v2

![logo](./public/logo.png)

[![en](https://img.shields.io/badge/lang-en-red.svg)](./README.en.md) [![ko](https://img.shields.io/badge/lang-ko-blue.svg)](./README.md)

Next.js-based personal blog with MDX multi-language support, in-browser Studio editor, and GitHub auto commit.

## 1) Overview

- Name: leey00nsu-next-blog-v2
- Description: An MDX-driven technical blog that manages Korean/English posts. You can write posts in a web editor and commit them directly to a GitHub branch.
- Purpose / Problems solved:
  - Simplify authoring/translation/deployment pipeline using GitHub
  - Provide essentials for blogging: image path/metadata, code highlighting, ToC, comments
  - Manage multilingual posts as files (.ko/.en) and automate translation with OpenAI
- Key features:
  - MDX rendering: GFM, soft line breaks, code highlighting, auto-injected image metadata (width/height, LQIP)
  - i18n: `next-intl` with per-locale MDX files (`{slug}.{locale}.mdx`)
  - Studio: Edit frontmatter/body in the browser, upload/preview images, remap image paths on slug changes, translate via OpenAI, and commit all locales at once
  - Deployment: Commit MDX/images to a designated GitHub branch via Octokit
  - Auth: GitHub OAuth (NextAuth v5) and allowlisted user only for Studio
  - Comments: Giscus

## 2) Tech Stack

- Framework: Next.js 15.5.2 (App Router), React 19.1.0
- Styling/UI: Tailwind CSS 4, shadcn/ui
- MDX: `next-mdx-remote`, `remark-gfm`, `remark-breaks`, `rehype-slug`, `rehype-pretty-code`
- i18n: `next-intl` v3
- Editor: `@mdxeditor/editor`
- Auth: `next-auth@5` (GitHub provider)
- Translation/Automation: OpenAI SDK, Octokit (GitHub API)
- Images/Media: `sharp`, `lqip-modern`
- Utils: `gray-matter`, `zod`, `es-toolkit`, `lucide-react`, `react-hook-form`
- Dev tools: ESLint 9 (unicorn), Prettier (+tailwind plugin), Husky, lint-staged

## 3) Getting Started

- Requirements
  - Node.js 18.18+ (Recommended: Node.js 20 LTS)
  - pnpm (recommended)
  - GitHub OAuth App, GitHub Personal Access Token, OpenAI API Key

- Install
  1. Clone repository

  ```bash
  git clone https://github.com/leey00nsu/leey00nsu-next-blog-v2
  cd leey00nsu-next-blog-v2
  ```

  2. Install dependencies

  ```bash
  pnpm install
  ```

- Run
  - Dev server

  ```bash
  pnpm dev
  ```

  - Production build/run

  ```bash
  pnpm build
  pnpm start
  ```

- .env.local example

Note: The following is an example. Never commit real keys/secrets.

```env
# Giscus (public)
NEXT_PUBLIC_GISCUS_REPO=<owner>/<repo>
NEXT_PUBLIC_GISCUS_REPO_ID=<repo_id>
NEXT_PUBLIC_GISCUS_CATEGORY=Announcements
NEXT_PUBLIC_GISCUS_CATEGORY_ID=<category_id>

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# GitHub OAuth (NextAuth)
AUTH_GITHUB_ID=<github_oauth_client_id>
AUTH_GITHUB_SECRET=<github_oauth_client_secret>
AUTH_SECRET=<random_secret>

# Studio allowlist
ALLOWED_GITHUB_USERNAME=<your_github_username>

# GitHub auto commit (Octokit)
GITHUB_OWNER=<owner>
GITHUB_REPO=<repo>
GITHUB_BRANCH=<branch>
GITHUB_TOKEN=<github_pat>

# OpenAI (translation)
OPENAI_API_KEY=<openai_api_key>
# Optional: model (default gpt-5-mini)
OPENAI_MDX_MODEL=gpt-5-mini

# Optional: defaults for MDX i18n script
MDX_I18N_SOURCE=ko
MDX_I18N_TARGETS=ko,en
```

Tips

- GitHub OAuth: Set Authorization callback to `NEXT_PUBLIC_APP_URL/api/auth/callback/github`.
- Giscus: Use https://giscus.app to get repo/category IDs.
- GitHub Token: Use a token with push permission to your repo.

## 4) Usage

- Browse blog
  - Open `http://localhost:3000/blog`

- Write/commit via Studio
  1. Sign in with GitHub (allowlisted only)
  2. Visit `/studio`
  3. Fill frontmatter (required: `slug`, `title`, `description`, `writer`, `section`, `date`, `tags`)
  4. Write MDX and upload images (preview/path auto)
  5. Choose source/target locales (e.g., source=ko, targets=ko,en)
  6. Save → Translate (targets) via OpenAI → Commit MDX/images to GitHub
  - Result: `public/posts/{slug}/{slug}.{locale}.mdx` and images in the same folder

- Batch-generate MDX translations
  - Prereq: `OPENAI_API_KEY`
  - Commands

  ```bash
  # Defaults: source=LOCALES.DEFAULT, targets=LOCALES.SUPPORTED
  pnpm gen:mdx-i18n

  # With args
  pnpm gen:mdx-i18n --source=ko --targets=en

  # With env vars
  MDX_I18N_SOURCE=ko MDX_I18N_TARGETS=en pnpm gen:mdx-i18n
  ```

  - Behavior: Scans `public/posts/{slug}` and `public/about` and creates missing locale files.

## 5) Project Structure

This project follows FSD (Feature‑Sliced Design). See [AGENTS](./AGENTS.md) for rules.

```
app/                # Routing, layout, RSC composition (e.g., /blog, /studio, API routes)
widgets/            # Page sections composed of multiple features/entities
features/           # User actions (UI + model + API)
entities/           # Domain objects (types/queries)
shared/             # Shared UI/utils/config (no domain knowledge)
messages/           # next-intl messages (ko/en)
scripts/            # Node scripts (MDX i18n generation)
public/             # Static files and MDX posts (with images)
```

- Examples
  - `features/studio`: authoring/commit/translation (e.g., `api/translate-mdx.ts`, `actions/commit-to-github.ts`)
  - `entities/post`: types + read APIs (`getPostBySlug`, `getAllPosts`)
  - `features/mdx`: renderer and remark/rehype plugins
  - `shared/config/constants.ts`: paths, locales, routes, OG helpers

FSD dependency flow: `shared → entities → features → widgets → app`

## 6) License

MIT License – see [LICENSE](./LICENSE).

## 7) Contact

- Author: leey00nsu
- GitHub: https://github.com/leey00nsu
