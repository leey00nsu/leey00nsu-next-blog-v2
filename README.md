# leey00nsu-next-blog-v2

![logo](./public/logo.webp)

[![en](https://img.shields.io/badge/lang-en-red.svg)](./README.en.md) [![ko](https://img.shields.io/badge/lang-ko-blue.svg)](./README.md)

다국어(MDX) 지원, 포스트 편집 스튜디오(Studio), GitHub 자동 커밋을 포함한 Next.js 기반 개인 블로그.

## 1) 프로젝트 개요 (Overview)

- 이름: leey00nsu-next-blog-v2
- 설명: MDX 기반의 기술 블로그로, 한국어/영어 다국어 문서를 관리하며, 웹 에디터에서 작성한 글을 GitHub 브랜치로 직접 커밋할 수 있습니다.
- 목적/문제 해결:
  - MDX 문서의 작성·번역·배포 파이프라인을 GitHub를 활용한 단순화
  - 이미지 경로/메타데이터, 코드 하이라이트, 목차(ToC), 댓글 등 블로그 운영에 필요한 기능 일체 제공
  - 다국어 글(.ko/.en)을 파일 단위로 관리하고, OpenAI를 통해 번역 자동화
- 핵심 기능:
  - MDX 렌더링: GFM, 줄바꿈, 코드 하이라이트, 이미지 메타데이터 자동 주입(폭/높이·LQIP)
  - 다국어(i18n): `next-intl` + 로케일 별 MDX 파일 구조(`{slug}.{locale}.mdx`)
  - Studio: 브라우저에서 Frontmatter/본문 편집, 이미지 업로드·미리보기, 슬러그 변경 시 이미지 경로 일괄 리매핑, OpenAI 번역 후 다국어 파일 동시 커밋
  - AI 이미지 생성: 에디터에서 텍스트 선택 후 AI로 이미지 생성, 어댑터 패턴으로 다양한 Provider 지원
  - 배포 파이프라인: GitHub API(Octokit)로 지정 브랜치에 MDX/이미지 커밋
  - 인증: GitHub OAuth(NextAuth v5) + 허용 사용자만 Studio 접근
  - PDF 내보내기: Playwright로 `/print/resume` 화면을 렌더링해 About · 프로젝트 상세를 하나의 포트폴리오 PDF로 다운로드
  - 댓글: Giscus

## 2) 기술 스택 (Tech Stack)

- 프레임워크: Next.js 16.1.1 (App Router), React 19.1.0
- 스타일/UI: Tailwind CSS 4, shadcn/ui
- MDX: `next-mdx-remote`, `remark-gfm`, `remark-breaks`, `rehype-slug`, `rehype-pretty-code`
- i18n: `next-intl` v4
- 에디터: Tiptap (Notion 스타일)
- 인증: `next-auth@5`(GitHub Provider)
- 번역/자동화: OpenAI SDK, Octokit(GitHub API)
- 이미지/미디어: `sharp`, `lqip-modern`
- 유틸: `gray-matter`, `zod`, `es-toolkit`, `lucide-react`, `react-hook-form`
- 테스트: Vitest, Playwright, Storybook 10
- 개발 도구: ESLint 9 (unicorn 플러그인), Prettier(+tailwind 플러그인), Husky, lint-staged

## 3) 설치 및 실행 (Getting Started)

- 필수 요구사항
  - Node.js 18.18+ (권장: Node.js 20 LTS)
  - pnpm 설치(권장)
  - GitHub OAuth App, GitHub Personal Access Token, OpenAI API Key

- 설치
  1. 저장소 클론

  ```bash
  git clone https://github.com/leey00nsu/leey00nsu-next-blog-v2
  cd leey00nsu-next-blog-v2
  ```

  2. 의존성 설치

  ```bash
  pnpm install
  ```

- 실행
  - Playwright 런타임 다운로드 (최초 1회)

  ```bash
  pnpm playwright:install
  ```

  - 개발 서버

  ```bash
  pnpm dev
  ```

  - 프로덕션 빌드/실행

  ```bash
  pnpm build
  pnpm start
  ```

  - Docker/Coolify 환경 빌드 명령어

  ```bash
  pnpm install && pnpm exec playwright install --with-deps chromium && pnpm run build
  ```

  > `postbuild` 단계에서 임시 서버를 띄워 PDF를 자동 생성합니다.
  > Playwright Chromium이 필요하므로 빌드 전에 설치해야 합니다.

- 환경 변수(.env.local) 예시

주의: 아래 값은 예시이며 실제 Key/Secret은 절대 커밋하지 마세요.

```env
# Giscus (공개 가능)
NEXT_PUBLIC_GISCUS_REPO=<owner>/<repo>
NEXT_PUBLIC_GISCUS_REPO_ID=<repo_id>
NEXT_PUBLIC_GISCUS_CATEGORY=Announcements
NEXT_PUBLIC_GISCUS_CATEGORY_ID=<category_id>

# 앱 URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# GitHub OAuth (NextAuth)
AUTH_GITHUB_ID=<github_oauth_client_id>
AUTH_GITHUB_SECRET=<github_oauth_client_secret>
AUTH_SECRET=<random_secret>

# Studio 접근 허용 GitHub 사용자
ALLOWED_GITHUB_USERNAME=<your_github_username>

# GitHub 자동 커밋 설정(Octokit)
GITHUB_OWNER=<owner>
GITHUB_REPO=<repo>
GITHUB_BRANCH=<branch>
GITHUB_TOKEN=<github_pat>

# PDF 생성 캐시 (선택)
RESUME_PDF_CACHE_DIR=.next/cache/resume-pdf
# RESUME_PDF_CACHE_TTL=86400000 # 밀리초 단위 TTL, 기본은 무기한 캐시
# Playwright 실행 파일 경로를 강제 지정하고 싶을 때 (선택)
PLAYWRIGHT_EXECUTABLE_PATH=/path/to/chromium

# OpenAI (번역)
OPENAI_API_KEY=<openai_api_key>
# 선택: 번역 모델 (기본 gpt-5-mini)
OPENAI_MDX_MODEL=gpt-5-mini

# 선택: MDX 일괄 번역 스크립트 기본값
MDX_I18N_SOURCE=ko
MDX_I18N_TARGETS=ko,en

# AI 이미지 생성 (LeesField API)
LEESFIELD_API_KEY=<leesfield_api_key>
```

설정 팁

- GitHub OAuth: Authorization callback URL은 `NEXT_PUBLIC_APP_URL/api/auth/callback/github`로 설정합니다.
- Giscus: https://giscus.app 에서 Repo/Category 선택 후 repoId, categoryId를 복사합니다.
- GitHub Token: 해당 저장소에 push 권한이 있는 토큰을 사용합니다.

## 4) 사용 방법 (Usage)

- 블로그 보기
  - 브라우저에서 `http://localhost:3000/blog` 접속

- Studio로 글 작성/커밋
  1. GitHub로 로그인(허용된 사용자만)
  2. `/studio` 페이지 접속
  3. Frontmatter(필수: `slug`, `title`, `description`, `writer`, `section`, `date`, `tags`)를 입력
  4. 본문(MDX) 작성 및 이미지 업로드(미리보기/경로 자동 생성)
  5. Source/Target 로케일 선택(예: source=ko, targets=ko,en)
  6. 저장 → OpenAI 번역(타겟 로케일), MDX/이미지를 GitHub 브랜치로 커밋
  - 커밋 결과: `public/posts/{slug}/{slug}.{locale}.mdx` 및 이미지가 동일 폴더에 생성됩니다.

- AI 이미지 생성
  1. 에디터에서 이미지로 만들고 싶은 텍스트를 선택
  2. AI 메뉴(✨) 클릭 → **이미지 생성** 선택
  3. 생성된 이미지가 선택 텍스트 뒤에 자동 삽입됨
  - 사전 조건: `LEESFIELD_API_KEY` 환경 변수 필요

- 기존 MDX 일괄 번역 스크립트
  - 사전 조건: `OPENAI_API_KEY` 필요
  - 명령어

  ```bash
  # 기본값: source=LOCALES.DEFAULT, targets=LOCALES.SUPPORTED 전체
  pnpm gen:mdx-i18n

  # 인자 지정
  pnpm gen:mdx-i18n --source=ko --targets=en

  # 환경 변수로 지정
  MDX_I18N_SOURCE=ko MDX_I18N_TARGETS=en pnpm gen:mdx-i18n
  ```

  - 동작: `public/posts/{slug}`와 `public/about`를 스캔해 누락된 로케일의 MDX 파일을 생성합니다.

- About · 프로젝트 PDF 다운로드
  - `/about` 페이지 상단의 `PDF 다운로드` 버튼을 클릭하면 포트폴리오 PDF를 다운로드합니다.
  - PDF는 빌드 시점(`postbuild`)에 자동 생성되어 `public/pdf/portfolio-{locale}.pdf`에 저장됩니다.
  - 빌드 시 Playwright Chromium이 필요합니다.

## 5) 프로젝트 구조 (Project Structure)

본 프로젝트는 FSD(Feature‑Sliced Design)를 따릅니다.
자세한 프로젝트 규칙은 [AGENTS](./AGENTS.md)를 참고하세요.

```
app/                # 라우팅, 레이아웃, RSC 조립 (예: /blog, /studio, API routes)
widgets/            # 여러 feature/entity로 조합된 페이지 구역 (예: PostDetail, Layout)
features/           # 사용자 행위 단위(UI+모델+API) (예: studio, mdx, post, auth)
entities/           # 도메인 개체(타입/조회/쿼리) (예: post 읽기)
shared/             # 공용 UI/유틸/설정 (도메인 지식 금지)
messages/           # next-intl 번역 메시지(ko/en)
scripts/            # Node 스크립트 (MDX i18n 생성 등)
public/             # 정적 파일 및 MDX 포스트(이미지 포함)
```

- 예시 디렉토리 역할
  - `features/studio`: 글 편집/커밋/번역 전담. `api/translate-mdx.ts`, `actions/commit-to-github.ts`, `ui/frontmatter-form.tsx` 등
  - `entities/post`: 포스트 타입·읽기 로직(`getPostBySlug`, `getAllPosts`)
  - `features/mdx`: 렌더러/remark·rehype 플러그인 구성
  - `shared/config/constants.ts`: 경로 상수, 로케일, 라우트, OG 이미지 빌더 등

FSD 참조 방향: `shared → entities → features → widgets → app`

## 6) 라이선스 (License)

This project is licensed under the MIT License – see the [LICENSE](./LICENSE) file for details.

## 7) 연락처 / 소개 (Contact)

- Author: leey00nsu
- GitHub: https://github.com/leey00nsu
