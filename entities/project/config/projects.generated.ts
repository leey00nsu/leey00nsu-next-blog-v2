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
        "Nivo",
        "Stomp.js"
      ],
      "thumbnail": "/public/projects/artfolio/artfolio.webp",
      "draft": false,
      "type": "team",
      "content": "\n## 프로젝트 소개\n\nGitHub : [https://github.com/leey00nsu/ArtFolio-FE](https://github.com/leey00nsu/ArtFolio-FE)\n\nAI 기반 예술품 경매 서비스입니다. 사용자가 그림을 업로드하면 AI가 분석하여 설명과 음성을 자동 생성하고, 실시간 경매 시스템을 통해 거래할 수 있습니다.  \n삼육대학교 SW프로젝트 경진대회에서 장려상을 수상하였으며, 팀 프로젝트에서 **프론트엔드 개발과 팀장을 담당**했습니다.\n\n## 주요 기능\n\n- 웹소켓(Stomp.js)을 활용한 실시간 예술품 경매 및 입찰\n- Nivo를 활용한 경매가 실시간 차트 시각화\n- AI 분석 기반 예술품 평가 및 설명 자동 생성\n\n## 기술 스택\n\n- Frontend: React, TypeScript, Tailwind CSS, Zustand, Nivo, Stomp.js\n- Backend: NestJS, PostgreSQL, Prisma\n",
      "width": 2714,
      "height": 1528
    },
    "blog": {
      "slug": "blog",
      "title": "블로그",
      "summary": "Next.js + MDX 기반, AI 자동 번역과 GitHub 연동 블로그",
      "period": {
        "start": "2025-09",
        "end": null
      },
      "techStacks": [
        "Next.js",
        "TypeScript",
        "Tailwind CSS"
      ],
      "thumbnail": "/public/projects/blog/logo.webp",
      "draft": false,
      "type": "solo",
      "content": "\n## 프로젝트 소개\n\nGitHub : [https://github.com/leey00nsu/leey00nsu-next-blog-v2](https://github.com/leey00nsu/leey00nsu-next-blog-v2)\n\nNext.js 기반의 기술 블로그입니다. 자체 웹 에디터에서 작성한 글을 AI가 한국어/영어로 자동 번역하고, GitHub API를 통해 브랜치에 직접 커밋하여 배포까지 자동화했습니다.\n**글쓰기부터 배포까지 완전 자동화된 블로그 파이프라인**을 구축한 것이 특징입니다.\n\n## 주요 기능\n\n- 웹 에디터를 통한 MDX 문서 작성\n- AI 자동 번역(한국어 ↔ 영어) 지원\n- GitHub API 연동 자동 커밋\n- 이미지 메타데이터 추출 및 LCP/CLS 개선\n- FSD 아키텍처 기반 모듈화\n\n## 기술 스택\n\n- Frontend: Next.js, TypeScript, Tailwind CSS\n- Infra: GitHub API (Octokit), OpenAI SDK\n",
      "width": 2048,
      "height": 2048
    },
    "leemage": {
      "slug": "leemage",
      "title": "Leemage",
      "summary": "OCI Object Storage 기반, Cloudinary 대안 이미지 관리 플랫폼",
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
      "type": "solo",
      "content": "\n## 프로젝트 소개\n\nGitHub : [https://github.com/leey00nsu/leemage](https://github.com/leey00nsu/leemage)\n\nOracle Cloud Infrastructure(OCI) Object Storage를 활용한 **셀프 호스팅 이미지 관리 플랫폼**입니다.  \nCloudinary와 유사한 기능을 직접 구현하여, 프로젝트 단위로 이미지를 효율적으로 관리하고 개발자 친화적인 API를 제공합니다.\n\n## 주요 기능\n\n- OCI Object Storage 기반 이미지 업로드 및 관리\n- 프로젝트 단위 이미지 관리 및 API 제공\n- 반응형 대시보드와 직관적 UI\n- FSD 아키텍처 기반 확장성 확보\n\n## 기술 스택\n\n- Frontend: Next.js, TypeScript, Tailwind CSS\n- Backend: PostgreSQL, Prisma, Next.js API Routes\n- Infra: Oracle Cloud Infrastructure (Object Storage)\n",
      "width": 1024,
      "height": 1024
    },
    "syu-character-maker": {
      "slug": "syu-character-maker",
      "title": "나만의 수야,수호 만들기",
      "summary": "삼육대 마스코트 꾸미기, 공유 웹 프로그램",
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
      "thumbnail": "/public/projects/syu-character-maker/syu-character-maker.webp",
      "draft": false,
      "type": "solo",
      "content": "\n## 프로젝트 소개\n\nGitHub : [https://github.com/leey00nsu/syu-character-maker](https://github.com/leey00nsu/syu-character-maker)\n\n삼육대학교 마스코트 **수야/수호를 꾸밀 수 있는 웹 프로그램**입니다.  \n학생들이 자유롭게 캐릭터를 꾸미고 결과를 이미지로 저장하거나 학우들과 공유할 수 있도록 했습니다.\n\n## 주요 기능\n\n- React-konva 캔버스 기반 꾸미기 도구(펜, 스티커 등)\n- 결과물 이미지 다운로드 및 업로드 공유\n- Zustand + TanStack Query 기반 상태 관리 및 최적화\n\n## 기술 스택\n\n- Frontend: React, TypeScript, Tailwind CSS, Zustand, React-konva\n- Backend: NestJS, PostgreSQL, Prisma, Redis\n",
      "width": 2578,
      "height": 1810
    }
  },
  "en": {
    "artfolio": {
      "slug": "artfolio",
      "title": "ArtFolio",
      "summary": "AI-powered art auction service",
      "period": {
        "start": "2023-04",
        "end": "2023-09"
      },
      "techStacks": [
        "React",
        "TypeScript",
        "Tailwind CSS",
        "Zustand",
        "Nivo",
        "Stomp.js"
      ],
      "thumbnail": "/public/projects/artfolio/artfolio.webp",
      "draft": false,
      "type": "team",
      "content": "\n## Project Overview\n\nGitHub : [https://github.com/leey00nsu/ArtFolio-FE](https://github.com/leey00nsu/ArtFolio-FE)\n\nThis is an AI-powered art auction service. When a user uploads a painting, the AI analyzes it and automatically generates descriptions and audio, and items can be traded through a real-time auction system.  \nThe project won the Encouragement Award at the Sahmyook University SW Project Competition, and I served as the team lead and was responsible for **frontend development and team leadership**.\n\n## Key Features\n\n- Real-time art auctions and bidding using WebSockets (Stomp.js)\n- Real-time auction price chart visualization using Nivo\n- AI-driven artwork evaluation and automatic generation of descriptions\n\n## Tech Stack\n\n- Frontend: React, TypeScript, Tailwind CSS, Zustand, Nivo, Stomp.js\n- Backend: NestJS, PostgreSQL, Prisma\n",
      "width": 2714,
      "height": 1528
    },
    "blog": {
      "slug": "blog",
      "title": "Blog",
      "summary": "Next.js + MDX-based blog with AI automatic translation and GitHub integration",
      "period": {
        "start": "2025-09",
        "end": null
      },
      "techStacks": [
        "Next.js",
        "TypeScript",
        "Tailwind CSS"
      ],
      "thumbnail": "/public/projects/blog/logo.webp",
      "draft": false,
      "type": "solo",
      "content": "\n## Project Overview\n\nGitHub : [https://github.com/leey00nsu/leey00nsu-next-blog-v2](https://github.com/leey00nsu/leey00nsu-next-blog-v2)\n\nThis is a technology blog built with Next.js. Articles written in the built-in web editor are automatically translated between Korean and English by AI, and are committed directly to a branch via the GitHub API to automate deployment.\n**A fully automated blog pipeline from writing to deployment** is a key feature.\n\n## Key Features\n\n- MDX document authoring via a web editor\n- AI automatic translation (Korean ↔ English)\n- Automatic commits via GitHub API integration\n- Image metadata extraction and LCP/CLS improvements\n- Modularization based on FSD architecture\n\n## Tech Stack\n\n- Frontend: Next.js, TypeScript, Tailwind CSS\n- Infra: GitHub API (Octokit), OpenAI SDK\n",
      "width": 2048,
      "height": 2048
    },
    "leemage": {
      "slug": "leemage",
      "title": "Leemage",
      "summary": "OCI Object Storage–based image management platform, an alternative to Cloudinary",
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
      "type": "solo",
      "content": "\n## Project Overview\n\nGitHub : [https://github.com/leey00nsu/leemage](https://github.com/leey00nsu/leemage)\n\nThis is a self-hosted image management platform using Oracle Cloud Infrastructure (OCI) Object Storage.  \nIt implements features similar to Cloudinary, enabling efficient project-level image management and providing developer-friendly APIs.\n\n## Key Features\n\n- Image upload and management based on OCI Object Storage\n- Project-scoped image management and APIs\n- Responsive dashboard and intuitive UI\n- Scalability through FSD (Feature-Sliced Design) architecture\n\n## Tech Stack\n\n- Frontend: Next.js, TypeScript, Tailwind CSS\n- Backend: PostgreSQL, Prisma, Next.js API Routes\n- Infra: Oracle Cloud Infrastructure (Object Storage)\n",
      "width": 1024,
      "height": 1024
    },
    "syu-character-maker": {
      "slug": "syu-character-maker",
      "title": "Create Your Own Suya and Suho",
      "summary": "A web app to customize and share Sahmyook University mascots",
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
      "thumbnail": "/public/projects/syu-character-maker/syu-character-maker.webp",
      "draft": false,
      "type": "solo",
      "content": "\n## Project Introduction\n\nGitHub : [https://github.com/leey00nsu/syu-character-maker](https://github.com/leey00nsu/syu-character-maker)\n\nThis is a web application that lets you customize Sahmyook University mascots, Suya and Suho.  \nStudents can freely decorate the characters and save the results as images or share them with classmates.\n\n## Key Features\n\n- React-konva canvas-based decorating tools (pen, stickers, etc.)\n- Download the result as an image and upload/share\n- State management and optimization using Zustand + TanStack Query\n\n## Tech Stack\n\n- Frontend: React, TypeScript, Tailwind CSS, Zustand, React-konva\n- Backend: NestJS, PostgreSQL, Prisma, Redis\n",
      "width": 2578,
      "height": 1810
    }
  }
} as const satisfies GeneratedProjectsMap
