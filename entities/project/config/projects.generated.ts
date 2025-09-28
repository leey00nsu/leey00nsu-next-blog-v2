// 이 파일은 scripts/generate-projects-data.ts 스크립트에 의해 생성되었습니다.
// 직접 수정하지 마세요.

import { GeneratedProjectsMap } from '@/entities/project/model/types'

export const GENERATED_PROJECTS = {
  "ko": {
    "artfolio": {
      "slug": "artfolio",
      "title": "아트폴리오",
      "summary": "AI 기반 예술품 경매 서비스",
      "period": {
        "start": "2023-04",
        "end": "2023-09"
      },
      "techStacks": [
        "React",
        "TypeScript",
        "Tailwind CSS",
        "Zustand",
        "Nivo"
      ],
      "thumbnail": "/public/projects/artfolio/artfolio.png",
      "draft": false,
      "content": "\n## 프로젝트 소개\n\nGithub 주소 : [https://github.com/leey00nsu/ArtFolio-FE](https://github.com/leey00nsu/ArtFolio-FE)\n\n아트폴리오는 AI 기반 예술품 경매 서비스입니다.\n사용자가 업로드한 그림을 AI를 통해 분석하고, 그림에 맞는 설명과 음성을 자동으로 생성합니다.\n프론트엔드 2명, 백엔드 2명, 디자이너 1명으로 진행되었으며 프론트엔드 및 팀장을 맡았습니다.\n삼육대학교 SW프로젝트 경진대회에서 장려상을 수상하였습니다.\n\n## 주요 기능\n\n- 실시간 예술품 경매 리스트\n- 실시간 경매가 차트 그래프 제공\n- AI를 활용한 예술품 평가 차트 제공\n\n## 기술 스택\n\n### Frontend\n\n- 프레임워크: React\n- 언어: TypeScript\n- 스타일/UI: Tailwind CSS\n- 상태 관리: React Query (TanStack Query), Zustand\n- 차트: Nivo\n",
      "width": 2714,
      "height": 1528
    },
    "blog": {
      "slug": "blog",
      "title": "블로그",
      "summary": "Next.js MDX 기반의 AI를 활용한 다국어 지원 블로그",
      "period": {
        "start": "2025-09",
        "end": null
      },
      "techStacks": [
        "Next.js",
        "TypeScript",
        "Tailwind CSS"
      ],
      "thumbnail": "/public/projects/blog/logo.png",
      "draft": false,
      "content": "\n## 프로젝트 소개\n\nGithub 주소 : [https://github.com/leey00nsu/leey00nsu-next-blog-v2](https://github.com/leey00nsu/leey00nsu-next-blog-v2)\n\nNext.js MDX 기반의 기술 블로그로 자체 에디터에서 작성한 글을 AI를 활용해 한국어/영어 다국어 문서를 생성하고, GitHub 브랜치로 자동으로 커밋할 수 있습니다.\n\n## 주요 기능\n\n- mdx 파일을 기반으로한 웹 에디터를 통한 콘텐츠 작성\n- AI를 활용한 다국어 문서 생성\n- GitHub 브랜치로 자동 커밋\n- 이미지 메타데이터 생성을 통해 LCP 최적화\n- 프로젝트 모듈화를 위한 FSD(FEature-Sliced Design) 구조 적용\n\n## 기술 스택\n\n- 프레임워크: Next.js\n- 언어: TypeScript\n- 스타일/UI: Tailwind CSS, shadcn/ui\n- MDX: next-mdx-remote, remark-gfm, remark-breaks, rehype-slug, rehype-pretty-code\n- i18n: next-intl\n- 에디터: @mdxeditor/editor\n- 인증: next-auth@5(GitHub Provider)\n- 번역: OpenAI SDK\n- 자동 커밋: Octokit(GitHub API)\n- 이미지 처리: sharp, lqip-modern\n- 유틸: gray-matter, zod, es-toolkit, lucide-react, react-hook-form\n- 개발 도구: ESLint, Prettier, Husky, lint-staged\n",
      "width": 2048,
      "height": 2048
    },
    "leemage": {
      "slug": "leemage",
      "title": "leemage",
      "summary": "Next.js, Oracle Cloud Infrastructure (OCI) Object Storage를 활용한 이미지 관리 플랫폼",
      "period": {
        "start": "2025-05",
        "end": "2025-06"
      },
      "techStacks": [
        "Next.js",
        "TypeScript",
        "Tailwind CSS",
        "Oracle Cloud Infrastructure",
        "PostgreSQL",
        "Prisma"
      ],
      "thumbnail": "/public/projects/leemage/logo.webp",
      "draft": false,
      "content": "\n## 프로젝트 소개\n\nGithub 주소 : [https://github.com/leey00nsu/leemage](https://github.com/leey00nsu/leemage)\n\nLeemage는 Oracle Cloud Infrastructure (OCI) Object Storage를 활용하여 구축된 이미지 관리 플랫폼입니다.\nCloudinary와 유사한 기능을 제공하며, 프로젝트 단위로 이미지를 효율적으로 관리할 수 있습니다.\nNext.js와 최신 웹 기술을 사용하여 직관적이고 반응형 사용자 인터페이스를 제공하며, 개발자 친화적인 API를 통해 외부 서비스와 쉽게 통합할 수 있습니다.\n\n## 주요 기능\n\n- Oracle Cloud Infrastructure (OCI) Object Storage를 활용한 이미지 관리\n- 프로젝트 단위로 이미지 관리\n- 프로젝트 모듈화를 위한 FSD(FEature-Sliced Design) 구조 적용\n\n## 기술 스택\n\n### Frontend\n\n- 프레임워크: Next.js\n- 언어: TypeScript\n- 스타일/UI: Tailwind CSS , Shadcn\n- 상태 관리: React Query (TanStack Query)\n\n### Backend\n\n- 프레임워크: Next.js API routes\n- 언어: TypeScript\n- 데이터베이스: PostgreSQL\n- ORM: Prisma\n- 인증: iron-session\n- 이미지 처리: sharp\n- 스토리지: Oracle Cloud Infrastructure (OCI) Object Storage\n",
      "width": 1024,
      "height": 1024
    },
    "syu-character-maker": {
      "slug": "syu-character-maker",
      "title": "나만의 수야,수호 만들기",
      "summary": "삼육대학교 마스코트인 수야, 수호를 꾸밀 수 있는 프로그램",
      "period": {
        "start": "2023-05",
        "end": "2023-12"
      },
      "techStacks": [
        "React",
        "TypeScript",
        "Tailwind CSS",
        "Zustand",
        "React-konva"
      ],
      "thumbnail": "/public/projects/syu-character-maker/syu-character-maker.png",
      "draft": false,
      "content": "\n## 프로젝트 소개\n\nGithub 주소 : [https://github.com/leey00nsu/syu-character-maker](https://github.com/leey00nsu/syu-character-maker)\n\n나만의 수야,수호 만들기는 삼육대학교 마스코트인 수야, 수호를 꾸밀 수 있는 프로그램입니다.\n자유롭게 꾸민 수야, 수호를 업로드하여 학우들과 공유할 수 있습니다.\n\n## 주요 기능\n\n- 수야,수호를 배경으로 펜 툴과 꾸미기 도구를 사용하여 수야, 수호를 꾸밀 수 있습니다.\n- 결과를 이미지로 다운로드 받거나, 업로드하여 학우들과 공유할 수 있습니다.\n\n## 기술 스택\n\n### Frontend\n\n- 프레임워크: React\n- 언어: TypeScript\n- 스타일/UI: Tailwind CSS\n- 상태 관리: React Query (TanStack Query), Zustand\n- 캔버스: React-konva\n\n### Backend\n\n- 프레임워크: NestJS\n- 언어: TypeScript\n- 데이터베이스: PostgreSQL\n- ORM: Prisma\n- 인증: Redis\n",
      "width": 2578,
      "height": 1810
    }
  },
  "en": {
    "artfolio": {
      "slug": "artfolio",
      "title": "ArtFolio",
      "summary": "AI-based art auction service",
      "period": {
        "start": "2023-04",
        "end": "2023-09"
      },
      "techStacks": [
        "React",
        "TypeScript",
        "Tailwind CSS",
        "Zustand",
        "Nivo"
      ],
      "thumbnail": "/public/projects/artfolio/artfolio.png",
      "draft": false,
      "content": "\n## Project Overview\n\nGitHub: [https://github.com/leey00nsu/ArtFolio-FE](https://github.com/leey00nsu/ArtFolio-FE)\n\nArtFolio is an AI-based art auction service.\nIt analyzes images uploaded by users using AI and automatically generates descriptions and voice narration tailored to the artwork.\nThe project was carried out with 2 frontend developers, 2 backend developers, and 1 designer; I served as the frontend lead and team leader.\nWe received an honorable mention at the Sahmyook University SW Project Competition.\n\n## Key Features\n\n- Real-time art auction listings\n- Real-time auction price charts\n- AI-powered artwork evaluation charts\n\n## Tech Stack\n\n### Frontend\n\n- Framework: React\n- Language: TypeScript\n- Styling/UI: Tailwind CSS\n- State management: React Query (TanStack Query), Zustand\n- Charts: Nivo",
      "width": 2714,
      "height": 1528
    },
    "blog": {
      "slug": "blog",
      "title": "Blog",
      "summary": "A Next.js MDX-based technical blog that uses AI to provide multilingual support",
      "period": {
        "start": "2025-09",
        "end": null
      },
      "techStacks": [
        "Next.js",
        "TypeScript",
        "Tailwind CSS"
      ],
      "thumbnail": "/public/projects/blog/logo.png",
      "draft": false,
      "content": "\n## Project Overview\n\nGithub: [https://github.com/leey00nsu/leey00nsu-next-blog-v2](https://github.com/leey00nsu/leey00nsu-next-blog-v2)\n\nThis is a Next.js MDX-based technical blog that uses an in-house editor to create posts, leverages AI to generate Korean/English multilingual documents, and can automatically commit them to GitHub branches.\n\n## Key Features\n\n- Content authoring via a web editor based on MDX files\n- Generate multilingual documents using AI\n- Automatic commits to GitHub branches\n- LCP optimization by generating image metadata\n- Applied FSD (Feature-Sliced Design) structure for project modularization\n\n## Tech Stack\n\n- Framework: Next.js\n- Language: TypeScript\n- Styling/UI: Tailwind CSS, shadcn/ui\n- MDX: next-mdx-remote, remark-gfm, remark-breaks, rehype-slug, rehype-pretty-code\n- Internationalization: next-intl\n- Editor: @mdxeditor/editor\n- Authentication: next-auth@5 (GitHub Provider)\n- Translation: OpenAI SDK\n- Auto-commit: Octokit (GitHub API)\n- Image processing: sharp, lqip-modern\n- Utilities: gray-matter, zod, es-toolkit, lucide-react, react-hook-form\n- Dev tools: ESLint, Prettier, Husky, lint-staged",
      "width": 2048,
      "height": 2048
    },
    "leemage": {
      "slug": "leemage",
      "title": "leemage",
      "summary": "Image management platform using Next.js and Oracle Cloud Infrastructure (OCI) Object Storage",
      "period": {
        "start": "2025-05",
        "end": "2025-06"
      },
      "techStacks": [
        "Next.js",
        "TypeScript",
        "Tailwind CSS",
        "Oracle Cloud Infrastructure",
        "PostgreSQL",
        "Prisma"
      ],
      "thumbnail": "/public/projects/leemage/logo.webp",
      "draft": false,
      "content": "\n## Project Overview\n\nGitHub: [https://github.com/leey00nsu/leemage](https://github.com/leey00nsu/leemage)\n\nLeemage is an image management platform built using Oracle Cloud Infrastructure (OCI) Object Storage. It provides features similar to Cloudinary and enables efficient image management on a per-project basis. Using Next.js and modern web technologies, it offers an intuitive, responsive user interface and developer-friendly APIs for easy integration with external services.\n\n## Key Features\n\n- Image management using Oracle Cloud Infrastructure (OCI) Object Storage\n- Project-based image organization\n- FSD (Feature-Sliced Design) structure applied for project modularization\n\n## Tech Stack\n\n### Frontend\n\n- Framework: Next.js\n- Language: TypeScript\n- Styling/UI: Tailwind CSS, Shadcn\n- State management: React Query (TanStack Query)\n\n### Backend\n\n- Framework: Next.js API routes\n- Language: TypeScript\n- Database: PostgreSQL\n- ORM: Prisma\n- Authentication: iron-session\n- Image processing: sharp\n- Storage: Oracle Cloud Infrastructure (OCI) Object Storage",
      "width": 1024,
      "height": 1024
    },
    "syu-character-maker": {
      "slug": "syu-character-maker",
      "title": "Create Your Own Suya and Suho",
      "summary": "A program to customize Suya and Suho, the mascots of Sahmyook University",
      "period": {
        "start": "2023-05",
        "end": "2023-12"
      },
      "techStacks": [
        "React",
        "TypeScript",
        "Tailwind CSS",
        "Zustand",
        "React-konva"
      ],
      "thumbnail": "/public/projects/syu-character-maker/syu-character-maker.png",
      "draft": false,
      "content": "\n## Project Overview\n\nGithub 주소 : [https://github.com/leey00nsu/syu-character-maker](https://github.com/leey00nsu/syu-character-maker)\n\nCreate Your Own Suya and Suho lets you customize Suya and Suho, the mascots of Sahmyook University.\nYou can upload your customized Suya and Suho and share them with fellow students.\n\n## Key Features\n\n- Use a pen tool and decoration tools on the Suya/Suho canvas to customize them.\n- Download the result as an image or upload it to share with fellow students.\n\n## Tech Stack\n\n### Frontend\n\n- Framework: React\n- Language: TypeScript\n- Styling/UI: Tailwind CSS\n- State management: React Query (TanStack Query), Zustand\n- Canvas: React-konva\n\n### Backend\n\n- Framework: NestJS\n- Language: TypeScript\n- Database: PostgreSQL\n- ORM: Prisma\n- Authentication: Redis",
      "width": 2578,
      "height": 1810
    }
  }
} as const satisfies GeneratedProjectsMap
