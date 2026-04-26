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

→ 개발 서버가 출력하는 로컬 주소에서 확인

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
- 블로그 Q&A 챗봇
  - 빌드 시 MDX를 lexical 검색 레코드로 변환하고, 배포 후 Postgres(`pgvector`) 기반 RAG 인덱스를 갱신
  - 질문을 먼저 라우팅해 인사, 챗봇 정체성, 연락처, 최신/오래된 글, 현재 글 질문을 direct path로 처리
  - 일반 질문은 lexical 검색과 curated source(소개/프로젝트/assistant 내부 문서)를 우선 사용
  - 블로그 전체 주제/공통 철학 같은 질문은 Postgres 기반 임베딩 RAG를 우선 사용
  - 답변은 항상 citation 검증을 거치고, 근거가 부족하면 거절

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
| **AI/Automation** | OpenAI API, AI SDK, LangGraph.js, PostgreSQL (`pgvector`), Modal, Octokit |
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

정확한 변수명, 기본값, 설명은 **항상 [.env.example](./.env.example)** 를 기준으로 확인하세요.

특히 아래 그룹은 빠뜨리기 쉽습니다.

- Auth.js / GitHub OAuth
- GitHub 자동 커밋용 토큰
- OpenAI 번역/챗봇/질문 라우터 모델 설정
- Modal 기반 임베딩 endpoint 및 proxy auth
- Postgres 기반 Chat RAG 연결 정보
- 블로그 챗봇 제한값(top-k, 최소 점수, 길이 제한, short-window rate limit, 동시 요청 제한, 일일 quota, 캐시 TTL)

### 설정 팁

- **GitHub OAuth**: Authorization callback URL은 `NEXT_PUBLIC_APP_URL/api/auth/callback/github`로 설정
- **Giscus**: https://giscus.app 에서 Repo/Category 선택 후 repoId, categoryId를 복사
- **GitHub Token**: 해당 저장소에 push 권한이 있는 토큰을 사용

### 실행

```bash
# 개발 서버
pnpm dev

# Postgres RAG 인덱싱 (선택, 로컬에서 RAG까지 확인할 때)
pnpm run gen:chat-rag-postgres

# 프로덕션 빌드/실행
pnpm build
pnpm start

# Docker/Coolify 환경 빌드 명령어
pnpm install && pnpm exec playwright install --with-deps chromium && pnpm run build
```

> `postbuild` 단계에서 임시 서버를 띄워 PDF를 자동 생성합니다.  
> Playwright Chromium이 필요하므로 빌드 전에 설치해야 합니다.

### 로컬 Postgres (`pgvector`) 실행

로컬에서 RAG까지 확인하려면 Postgres를 먼저 띄워야 합니다.

`docker compose`는 기본적으로 루트 `.env`를 읽습니다. 로컬에서 compose까지 함께 쓰려면 `.env.example`을 `.env` 또는 `.env.local`과 동기화해 두는 편이 좋습니다.

```bash
docker compose -f docker-compose.postgres.yml up -d
```

기본 연결 정보는 `.env.example`과 동일하고, 아래 값으로 compose를 오버라이드할 수 있습니다.

```env
BLOG_CHAT_RAG_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/leey00nsu_blog
BLOG_CHAT_RAG_POSTGRES_DB=leey00nsu_blog
BLOG_CHAT_RAG_POSTGRES_USER=postgres
BLOG_CHAT_RAG_POSTGRES_PASSWORD=postgres
BLOG_CHAT_RAG_POSTGRES_PORT=5432
```

Postgres가 올라온 뒤에만 아래 명령이 동작합니다.

```bash
pnpm run gen:chat-rag-postgres
```

### 챗봇 인덱스 생성

- `predev`, `prebuild` 단계에서는 아래 deterministic 스크립트만 자동 실행됩니다.
  - `pnpm run gen:posts`
  - `pnpm run gen:projects`
  - `pnpm run gen:chat-semantic`
  - `pnpm run gen:blog-search`
- 이 프로젝트는 `.next` HTML 산출물을 직접 크롤링하지 않고, **원본 MDX를 섹션 단위 lexical 검색 레코드와 Postgres RAG 인덱스 입력 데이터로 생성**합니다.
- `gen:blog-search`는 `entities/post/config/blog-search-records.generated.ts`를 만듭니다.
- `gen:chat-rag-postgres`는 lexical/curated source를 바탕으로 Postgres RAG 인덱스를 새 `index_version`으로 생성한 뒤 마지막에만 활성화합니다.
- 임베딩 provider 또는 Postgres 연결이 설정되지 않으면 Postgres RAG 인덱싱은 건너뛰고 lexical 검색만 사용합니다.

### Coolify / CI-CD 운영 메모

- Coolify PostgreSQL 서비스에 `pgvector` extension이 활성화되어 있어야 합니다.
- `gen:chat-rag-postgres`는 `pnpm build`에 넣지 않는 것을 권장합니다.
- 권장 흐름은 다음과 같습니다.
  1. Coolify가 Git push를 감지해 새 이미지를 빌드/배포
  2. **Post-deployment Command**로 `pnpm run gen:chat-rag-postgres` 실행
  3. 새 인덱싱이 전부 성공하면 Postgres의 활성 `index_version`만 교체
- 이 방식이면 배포 중 인덱싱이 실패해도 이전 활성 인덱스가 그대로 남습니다.
- 운영 환경에서는 최소한 아래 값이 필요합니다.
  - `BLOG_CHAT_RAG_DATABASE_URL`
  - `MODAL_EMBEDDING_BASE_URL`
  - `MODAL_EMBEDDING_KEY`
  - `MODAL_EMBEDDING_SECRET`

## 사용 방법

### 블로그 보기

브라우저에서 `http://localhost:3000/blog` 접속

### 블로그 Q&A 사용

- 블로그 목록/상세 및 소개 페이지 우하단의 `블로그 Q&A` 버튼을 클릭
- 질문을 입력하면 서버가 먼저 질문을 라우팅합니다.
- 인사, 챗봇 정체성, 연락 방법, 최신/가장 오래된 글, 현재 글 질문은 direct path로 처리합니다.
- 일반 질문은 빌드 시 생성한 lexical 검색 레코드와 curated source(소개/프로젝트/assistant 내부 문서)를 함께 조회합니다.
- 블로그 전체 공통 주제나 여러 글을 가로지르는 질문은 Postgres RAG를 우선 사용합니다.
- lexical 검색이 부족한 일반 질문은 Postgres RAG를 fallback으로 사용합니다.
- 모델은 외부 브라우징/툴 호출 없이 제공된 근거만 사용합니다.
- 캐시는 질문 정규화 결과 기준으로 적용되어 같은 질문의 반복 비용을 줄임
- 무료 운영 보호를 위해 질문 길이는 기본 200자로 제한되고, KST 기준 서비스 전체 일일 질문 수도 기본 100회로 제한됨

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

### 블로그 Q&A 안전성 제한

- 검색은 서버가 통제합니다. 모델이 직접 검색/브라우징/파일 수정/툴 호출을 하지 않습니다.
- 검색 결과가 약하면 LLM을 호출하지 않습니다.
- 모델에는 top-k 근거만 전달해 비용을 줄입니다.
- 모델 응답은 JSON 스키마 형식으로 강제합니다.
- 서버는 모델이 반환한 citation URL이 실제 검색 결과 집합에 포함되는지 검증합니다.
- 검증 실패 시 답변 대신 안전한 거절 응답을 반환합니다.

### 챗봇 운영 메모

- 현재 검색은 빌드 시 생성한 lexical 검색 레코드, curated source, Postgres(`pgvector`) 기반 Graph-RAG를 함께 사용합니다.
- Question Planner가 direct response, clarification, lexical/semantic retrieval 경로를 먼저 결정합니다.
- lexical 후보와 semantic 후보는 하나의 근거 집합으로 병합하고, 필요할 때 rerank를 수행합니다.
- Postgres RAG 인덱싱이 설정되지 않아도 lexical 검색과 curated source 기반 응답은 계속 동작합니다.
- exact cache와 semantic cache를 사용해 반복 질문 비용을 줄이고, observability 이벤트로 검색/응답 경로를 기록합니다.

## 프로젝트 구조

본 프로젝트는 **FSD(Feature-Sliced Design)** 를 따릅니다.  
자세한 프로젝트 규칙은 [AGENTS.md](./AGENTS.md)를 참고하세요.

```
leey00nsu-next-blog-v2/
├── app/             # Next.js App Router (라우팅, 레이아웃, API routes)
├── widgets/         # 여러 feature/entity 조합 페이지 구역 (Chatbot, PostDetail, Layout 등)
├── features/        # 사용자 행위 단위 (auth, chat, editor, i18n, mdx, pdf, post, studio)
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
