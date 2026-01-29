![leey00nsu-next-blog-v2 Logo](./public/logo.webp)

<h1 align="center">
  <strong>leey00nsu-next-blog-v2</strong>
</h1>

<p align="center">
  <strong>다국어(MDX) 지원, 포스트 편집 스튜디오(Studio), GitHub 자동 커밋을 포함한 Next.js 기반 개인 블로그</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D18.18-brightgreen" alt="Node.js">
  <a href="https://leey00nsu.com"><img src="https://img.shields.io/badge/demo-live-blue" alt="Demo"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#주요-기능">주요 기능</a> •
  <a href="#기술-스택">기술 스택</a> •
  <a href="https://leey00nsu.com">데모</a>
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

## 목차

- [Quick Start](#quick-start)
- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [설치 및 설정](#설치-및-설정)
- [사용 방법](#사용-방법)
- [프로젝트 구조](#프로젝트-구조)
- [테스트](#테스트)
- [기여하기](#기여하기)
- [라이선스](#라이선스)

## Quick Start

```bash
# 1. 저장소 복제 및 의존성 설치
git clone https://github.com/leey00nsu/leey00nsu-next-blog-v2 && cd leey00nsu-next-blog-v2 && pnpm install

# 2. 환경 변수 설정
cp .env.example .env.local  # 환경 변수 편집

# 3. Playwright 설치 (PDF 생성용, 최초 1회)
pnpm playwright:install

# 4. 개발 서버 시작
pnpm dev
```

→ [http://localhost:3000](http://localhost:3000)에서 확인

## 주요 기능

### 📝 블로그

- MDX 렌더링: GFM, 줄바꿈, 코드 하이라이트, 이미지 메타데이터 자동 주입(폭/높이·LQIP)
- 목차(ToC) 자동 생성
- Giscus 댓글 시스템

### ✏️ Studio 편집기

- Tiptap 기반 Notion 스타일 에디터
- Frontmatter/본문 편집, 이미지 업로드·미리보기
- 슬러그 변경 시 이미지 경로 일괄 리매핑
- GitHub 브랜치로 MDX/이미지 자동 커밋

### 🌐 다국어 (i18n)

- `next-intl` 기반 한국어/영어 지원
- 로케일 별 MDX 파일 구조: `{slug}.{locale}.mdx`
- OpenAI를 통한 번역 자동화

### 🤖 AI 기능

- 에디터에서 텍스트 선택 후 AI 이미지 생성
- 어댑터 패턴으로 다양한 Provider 지원

### 📄 PDF 내보내기

- Playwright로 `/print/resume` 화면 렌더링
- About · 프로젝트 상세를 하나의 포트폴리오 PDF로 다운로드

### 🔐 인증

- GitHub OAuth (NextAuth v5)
- 허용 사용자만 Studio 접근

## 기술 스택

| 영역              | 기술                                            |
| ----------------- | ----------------------------------------------- |
| **Framework**     | Next.js 16.1.1 (App Router), React 19.1.0       |
| **Styling**       | Tailwind CSS 4, shadcn/ui                       |
| **MDX**           | next-mdx-remote, remark-gfm, rehype-pretty-code |
| **i18n**          | next-intl v4                                    |
| **Editor**        | Tiptap (Notion 스타일)                          |
| **Auth**          | next-auth@5 (GitHub Provider)                   |
| **AI/Automation** | OpenAI SDK, Octokit (GitHub API)                |
| **Image**         | sharp, lqip-modern                              |
| **Test**          | Vitest, Playwright, Storybook 10                |
| **DevOps**        | ESLint 9, Prettier, Husky, lint-staged          |

## 설치 및 설정

### 사전 요구사항

- Node.js 18.18+ (권장: Node.js 20 LTS)
- pnpm 설치
- GitHub OAuth App, GitHub Personal Access Token, OpenAI API Key

### 설치

```bash
# 저장소 클론
git clone https://github.com/leey00nsu/leey00nsu-next-blog-v2
cd leey00nsu-next-blog-v2

# 의존성 설치
pnpm install
```

### 환경 변수

`.env.example`을 복사하여 `.env.local`을 생성하고 값을 설정하세요:

```bash
cp .env.example .env.local
```

자세한 환경 변수 설명은 [.env.example](./.env.example) 파일을 참고하세요.

### 설정 팁

- **GitHub OAuth**: Authorization callback URL은 `NEXT_PUBLIC_APP_URL/api/auth/callback/github`로 설정
- **Giscus**: https://giscus.app 에서 Repo/Category 선택 후 repoId, categoryId를 복사
- **GitHub Token**: 해당 저장소에 push 권한이 있는 토큰을 사용

### 실행

```bash
# 개발 서버
pnpm dev

# 프로덕션 빌드/실행
pnpm build
pnpm start

# Docker/Coolify 환경 빌드 명령어
pnpm install && pnpm exec playwright install --with-deps chromium && pnpm run build
```

> `postbuild` 단계에서 임시 서버를 띄워 PDF를 자동 생성합니다.  
> Playwright Chromium이 필요하므로 빌드 전에 설치해야 합니다.

## 사용 방법

### 블로그 보기

브라우저에서 `http://localhost:3000/blog` 접속

### Studio로 글 작성/커밋

1. GitHub로 로그인 (허용된 사용자만)
2. `/studio` 페이지 접속
3. Frontmatter(필수: `slug`, `title`, `description`, `writer`, `section`, `date`, `tags`)를 입력
4. 본문(MDX) 작성 및 이미지 업로드
5. Source/Target 로케일 선택 (예: source=ko, targets=ko,en)
6. 저장 → OpenAI 번역(타겟 로케일), MDX/이미지를 GitHub 브랜치로 커밋

커밋 결과: `public/posts/{slug}/{slug}.{locale}.mdx` 및 이미지가 동일 폴더에 생성

### AI 이미지 생성

1. 에디터에서 이미지로 만들고 싶은 텍스트를 선택
2. AI 메뉴(✨) 클릭 → **이미지 생성** 선택
3. 생성된 이미지가 선택 텍스트 뒤에 자동 삽입됨

> 사전 조건: `LEESFIELD_API_KEY` 환경 변수 필요

### 기존 MDX 일괄 번역 스크립트

```bash
# 기본값: source=LOCALES.DEFAULT, targets=LOCALES.SUPPORTED 전체
pnpm gen:mdx-i18n

# 인자 지정
pnpm gen:mdx-i18n --source=ko --targets=en

# 환경 변수로 지정
MDX_I18N_SOURCE=ko MDX_I18N_TARGETS=en pnpm gen:mdx-i18n
```

`public/posts/{slug}`와 `public/about`를 스캔해 누락된 로케일의 MDX 파일을 생성합니다.

### About · 프로젝트 PDF 다운로드

- `/about` 페이지 상단의 `PDF 다운로드` 버튼을 클릭
- PDF는 빌드 시점(`postbuild`)에 자동 생성되어 `public/pdf/portfolio-{locale}.pdf`에 저장

## 프로젝트 구조

본 프로젝트는 **FSD(Feature-Sliced Design)** 를 따릅니다.  
자세한 프로젝트 규칙은 [AGENTS.md](./AGENTS.md)를 참고하세요.

```
leey00nsu-next-blog-v2/
├── app/             # Next.js App Router (라우팅, 레이아웃, API routes)
├── widgets/         # 여러 feature/entity 조합 페이지 구역 (PostDetail, Layout 등)
├── features/        # 사용자 행위 단위 (auth, editor, i18n, mdx, pdf, post, studio)
├── entities/        # 도메인 개체 (about, editor, post, project, studio)
├── shared/          # 공용 UI/유틸/설정 (도메인 지식 금지)
├── lib/             # 서버사이드 공용 로직
├── i18n/            # next-intl 라우팅 설정
├── messages/        # next-intl 번역 메시지 (ko/en)
├── scripts/         # Node 스크립트 (MDX i18n, PDF 생성 등)
├── public/          # 정적 파일 및 MDX 포스트 (이미지 포함)
├── e2e/             # Playwright E2E 테스트
└── views/           # 뷰 관련 파일
```

**FSD 참조 방향**: `shared → entities → features → widgets → app`

## 테스트

```bash
# 유닛 테스트
pnpm test

# 테스트 실행 (단일)
pnpm test:run

# 커버리지 포함
pnpm test:coverage

# E2E 테스트
pnpm test:e2e

# E2E UI 모드
pnpm test:e2e:ui
```

테스트 구조:

- `e2e/` - Playwright E2E 테스트
- `**/*.test.ts` - Vitest 유닛 테스트
- `**/*.stories.tsx` - Storybook 컴포넌트 문서

## 문제 해결

<details>
<summary><strong>Playwright 설치 오류</strong></summary>

```bash
# Chromium 수동 설치
pnpm playwright:install

# 또는 전체 브라우저 설치
pnpm exec playwright install --with-deps
```

</details>

<details>
<summary><strong>빌드 시 PDF 생성 실패</strong></summary>

- Playwright Chromium이 설치되어 있는지 확인
- `PLAYWRIGHT_EXECUTABLE_PATH` 환경 변수로 경로 지정 가능
- Docker 환경에서는 `--with-deps` 옵션으로 의존성 함께 설치

</details>

<details>
<summary><strong>GitHub 커밋 실패</strong></summary>

- `GITHUB_TOKEN`에 해당 저장소 push 권한이 있는지 확인
- `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH` 값 확인

</details>

<details>
<summary><strong>OpenAI 번역 오류</strong></summary>

- `OPENAI_API_KEY` 유효성 확인
- API 사용량 한도 확인

</details>

## 기여하기

1. Fork → 브랜치 생성 → 개발 → Pull Request

## 라이선스

[MIT License](./LICENSE)

---
