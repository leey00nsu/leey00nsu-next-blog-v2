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
      "summary": "멀티 스토리지 기반 파일·이미지 관리 플랫폼",
      "period": {
        "start": "2025-05",
        "end": "2025-06"
      },
      "techStacks": [
        "Next.js",
        "TypeScript",
        "Tailwind CSS",
        "PostgreSQL",
        "Prisma",
        "OCI Object Storage",
        "Cloudflare R2",
        "Sharp",
        "TanStack Query",
        "Zod"
      ],
      "thumbnail": "/public/projects/leemage/logo.webp",
      "draft": false,
      "type": "solo",
      "content": "\n## 프로젝트 소개\n\nGitHub : [https://github.com/leey00nsu/leemage](https://github.com/leey00nsu/leemage)\nDemo : [https://leemage.leey00nsu.com/](https://leemage.leey00nsu.com/)\n\n사이드 프로젝트에 파일 업로드 기능을 추가할 때 비용 문제가 발생했습니다.\n**OCI Object Storage / Cloudflare R2**는 Free Tier로 일정 용량을 무료로 제공하기 때문에, Cloudinary 같은 유료 서비스 대신 **비용 절감을 위한 자체 호스팅 파일 관리 플랫폼**을 구축했습니다.\n프로젝트 단위로 파일을 정리하고, 외부 API와 SDK를 통해 다른 프로젝트에 빠르게 통합할 수 있습니다.\n\n## 핵심 기능\n\n- 프로젝트 단위 파일 업로드/관리: 이미지·비디오·문서 등 모든 확장자 지원\n- 이미지 변환 옵션 제공: 리사이즈/포맷 변환\n- 외부 API/SDK 제공: RESTful API 및 TypeScript SDK 제공\n- OpenAPI 문서 자동화: Zod 스키마에서 OpenAPI 스펙 자동 생성\n- 멀티 스토리지 지원: OCI Object Storage / Cloudflare R2 선택 가능\n- i18n 지원: 한국어/영어 제공\n\n## Problem\n\n- **대용량 파일 업로드 시 서버 부하**: 파일이 서버를 거치면 메모리/네트워크 부하 급증\n- **멀티 스토리지 API 차이**: OCI Object Storage와 Cloudflare R2는 API 인터페이스가 상이하여 프로바이더 변경 시 코드 전체 수정 부담\n- **이미지 용량 최적화**: 무거운 이미지 리사이징/포맷 변환 필요\n- **API 문서 불일치**: API 문서를 별도 관리할 경우 코드와 문서 간 불일치 발생 가능\n\n## Solution\n\n- **Presigned URL 직접 업로드**: 클라이언트가 스토리지에 직접 업로드하여 서버 부하 제거\n- **Storage Adapter 패턴**: 공통 인터페이스로 프로바이더 독립적인 코드 작성, 새 프로바이더 추가 시 어댑터만 구현 (OCP 준수)\n- **Sharp 기반 이미지 변환**: 병렬 처리로 여러 variant 동시 생성, WebP/AVIF의 가벼운 차세대 포맷 지원\n- **TypeScript SDK**: 복잡한 3단계 업로드 플로우(presign → upload → confirm)를 단일 메서드로 추상화\n- **OpenAPI 자동 생성**: Zod 스키마에서 OpenAPI 스펙 자동 생성으로 API 문서와 타입 동기화\n\n## Impact\n\n- **서버 부하**: Presigned URL로 파일 전송 서버 부하 0%\n- **이미지 용량 최적화**: WebP/AVIF 변환으로 원본 대비 50-60% 감소\n- **비용 절감**: OCI, Cloudflare R2 Free Tier 활용\n- **통합 용이성**: TypeScript SDK로 외부 프로젝트에 빠른 통합 가능\n\n## 기술 스택\n\n- Frontend: Next.js, TypeScript, Tailwind CSS\n- Data/Validation: TanStack Query, Zod\n- Backend/DB: Next.js API Routes, Prisma, PostgreSQL\n- Image: Sharp\n- Infra: OCI Object Storage, Cloudflare R2\n",
      "width": 1024,
      "height": 1024
    },
    "leesfield": {
      "slug": "leesfield",
      "title": "Leesfield",
      "summary": "Hugging Face Space 기반 AI 이미지/비디오 생성 플랫폼",
      "period": {
        "start": "2025-06",
        "end": "2025-07"
      },
      "techStacks": [
        "Next.js",
        "TypeScript",
        "Tailwind CSS",
        "shadcn/ui",
        "PostgreSQL",
        "Prisma",
        "iron-session",
        "Hugging Face",
        "Gradio Client",
        "TanStack Query",
        "Zod"
      ],
      "thumbnail": "/public/projects/leesfield/logo.webp",
      "draft": false,
      "type": "solo",
      "content": "\n## 프로젝트 소개\n\nGitHub : [https://github.com/leey00nsu/leesfield](https://github.com/leey00nsu/leesfield)\nDemo : [https://leesfield.leey00nsu.com/](https://leesfield.leey00nsu.com/)\n\n사이드 프로젝트에 AI 이미지/비디오 생성 기능을 추가할 때 **자체 파이프라인**을 구축하고 싶었습니다.\n대부분의 이미지/비디오 생성 API는 유료로 제공되지만, **Hugging Face Zero GPU**는 제한적이지만 무료로 사용할 수 있어 비용 부담 없이 시작할 수 있었습니다.\n\n현재는 Hugging Face 어댑터만 구현되어 있지만, **어댑터 패턴으로 설계**되어 추후 다른 AI API(OpenAI, Replicate 등)도 쉽게 연동할 수 있습니다.\n다양한 AI 모델(FLUX 등)을 통합 UI/API로 제공하고, Leemage와 연동하여 생성된 결과를 자동으로 스토리지에 저장합니다.\n\n## 핵심 기능\n\n- AI 이미지/비디오 생성: 어댑터 기반 확장 가능 (현재 무료 Hugging Face Space 어댑터 제공)\n- 모델 카탈로그 관리: DB 기반 모델 등록/수정, 동적 UI 렌더링\n- 모니터링 대시보드: 생성 요청 현황 및 상태 모니터링\n- 생성 히스토리 관리: 모든 생성 요청 DB 저장\n- 외부 API 제공: Zod 스키마 기반 OpenAPI 자동 생성\n- Leemage 연동: 생성 결과 자동 업로드\n- i18n 지원: 한국어/영어 제공\n\n## Problem\n\n- **AI 모델 다양성**: 모델마다 API 인터페이스, 파라미터, 타임아웃이 상이\n- **스토리지 연동**: 생성 결과를 영구 저장하려면 외부 스토리지 연동 필요\n- **모델 설정 관리**: 모델별 파라미터, UI 타입, 기본값을 코드 수정 없이 관리 필요\n- **API 문서 불일치**: API 문서를 별도 관리할 경우 코드와 문서 간 불일치 발생 가능\n- **생성 요청 상태 파악 어려움**: AI 생성 요청의 성공/실패 현황, 처리 지연 여부를 실시간으로 파악하기 어려움\n\n## Solution\n\n- **API 호출 어댑터 패턴**: 모델 프로바이더(hf_space 등)별 어댑터 분리, 새 프로바이더 추가 시 어댑터만 구현\n- **Storage 어댑터 패턴**: Leemage 등 외부 스토리지 연동을 어댑터로 분리\n- **DB 기반 모델 카탈로그**: 관리 화면에서 모델 설정/파라미터 등록, 코드 수정 없이 모델 추가\n- **OpenAPI 자동 생성**: Zod 스키마에서 OpenAPI 스펙 자동 생성으로 API 문서와 타입 동기화\n- **통합 모니터링 대시보드**: 요청 현황(active/pending/processing), 에러율, 평균/P95 레이턴시를 실시간 조회. 모델별/API 키별 통계 및 일별 추이 차트 제공\n\n## Impact\n\n- **비용 절감**: Hugging Face Space 무료 GPU 활용\n- **모델 확장성**: DB 모델 카탈로그로 코드 수정 없이 새 모델 추가 가능\n- **저장소 연동**: Leemage 연동으로 생성 히스토리 영구 보존\n- **운영 가시성 확보**: 실시간 모니터링으로 요청 현황 및 에러율 즉시 확인 가능\n- **다국어 지원**: 한국어/영어 i18n\n\n## 기술 스택\n\n- Frontend: Next.js, TypeScript, Tailwind CSS, shadcn/ui\n- Data/Validation: TanStack Query, Zod\n- Backend/DB: Next.js API Routes, Prisma, PostgreSQL, iron-session\n- AI: Hugging Face Space, Gradio Client\n",
      "width": 512,
      "height": 512
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
      "summary": "Multi-storage based file and image management platform",
      "period": {
        "start": "2025-05",
        "end": "2025-06"
      },
      "techStacks": [
        "Next.js",
        "TypeScript",
        "Tailwind CSS",
        "PostgreSQL",
        "Prisma",
        "OCI Object Storage",
        "Cloudflare R2",
        "Sharp",
        "TanStack Query",
        "Zod"
      ],
      "thumbnail": "/public/projects/leemage/logo.webp",
      "draft": false,
      "type": "solo",
      "content": "\n## Project Overview\n\nGitHub : [https://github.com/leey00nsu/leemage](https://github.com/leey00nsu/leemage)\nDemo : [https://leemage.leey00nsu.com/](https://leemage.leey00nsu.com/)\n\nWhen adding file upload features to side projects, cost became an issue.\nSince **OCI Object Storage / Cloudflare R2** offer free tiers with a certain amount of storage, I built a **self-hosted file management platform for cost savings** instead of using paid services like Cloudinary.\nFiles can be organized by project and quickly integrated into other projects through external APIs and SDKs.\n\n## Key Features\n\n- Project-based file upload/management: Supports all file extensions including images, videos, and documents\n- Image transformation options: Resize/format conversion\n- External API/SDK: RESTful API and TypeScript SDK\n- OpenAPI documentation automation: Auto-generate OpenAPI spec from Zod schemas\n- Multi-storage support: Choose between OCI Object Storage / Cloudflare R2\n- i18n support: Korean/English\n\n## Problem\n\n- **Server load on large file uploads**: Memory/network load spikes when files go through the server\n- **Multi-storage API differences**: OCI Object Storage and Cloudflare R2 have different API interfaces, requiring full code modification when switching providers\n- **Image size optimization**: Heavy image resizing/format conversion needed\n- **API documentation mismatch**: When managing API docs separately, inconsistencies between code and documentation can occur\n\n## Solution\n\n- **Presigned URL direct upload**: Clients upload directly to storage, eliminating server load\n- **Storage Adapter pattern**: Write provider-independent code with common interfaces, implement only adapters for new providers (OCP compliant)\n- **Sharp-based image transformation**: Parallel processing to generate multiple variants simultaneously, supporting lightweight next-gen formats like WebP/AVIF\n- **TypeScript SDK**: Abstract complex 3-step upload flow (presign → upload → confirm) into a single method\n- **OpenAPI auto-generation**: Auto-generate OpenAPI spec from Zod schemas for API documentation and type synchronization\n\n## Impact\n\n- **Server load**: 0% server load for file transfers with Presigned URL\n- **Image size optimization**: 50-60% reduction compared to original with WebP/AVIF conversion\n- **Cost savings**: Utilizing OCI, Cloudflare R2 Free Tier\n- **Integration ease**: Quick integration into external projects with TypeScript SDK\n\n## Tech Stack\n\n- Frontend: Next.js, TypeScript, Tailwind CSS\n- Data/Validation: TanStack Query, Zod\n- Backend/DB: Next.js API Routes, Prisma, PostgreSQL\n- Image: Sharp\n- Infra: OCI Object Storage, Cloudflare R2\n",
      "width": 1024,
      "height": 1024
    },
    "leesfield": {
      "slug": "leesfield",
      "title": "Leesfield",
      "summary": "AI image/video generation platform based on Hugging Face Space",
      "period": {
        "start": "2025-06",
        "end": "2025-07"
      },
      "techStacks": [
        "Next.js",
        "TypeScript",
        "Tailwind CSS",
        "shadcn/ui",
        "PostgreSQL",
        "Prisma",
        "iron-session",
        "Hugging Face",
        "Gradio Client",
        "TanStack Query",
        "Zod"
      ],
      "thumbnail": "/public/projects/leesfield/logo.webp",
      "draft": false,
      "type": "solo",
      "content": "\n## Project Overview\n\nGitHub : [https://github.com/leey00nsu/leesfield](https://github.com/leey00nsu/leesfield)\nDemo : [https://leesfield.leey00nsu.com/](https://leesfield.leey00nsu.com/)\n\nWhen adding AI image/video generation to side projects, I wanted to build my **own pipeline**.\nMost image/video generation APIs are paid, but **Hugging Face Zero GPU** offers limited free usage, allowing me to start without cost concerns.\n\nCurrently only the Hugging Face adapter is implemented, but the **adapter pattern design** allows easy integration with other AI APIs (OpenAI, Replicate, etc.) in the future.\nIt provides various AI models (FLUX, etc.) through a unified UI/API and automatically saves generated results to storage via Leemage integration.\n\n## Key Features\n\n- AI image/video generation: Adapter-based extensible architecture (currently provides free Hugging Face Space adapter)\n- Model catalog management: DB-based model registration/editing, dynamic UI rendering\n- Monitoring dashboard: Generation request status and monitoring\n- Generation history management: All generation requests saved to DB\n- External API: OpenAPI auto-generation based on Zod schemas\n- Leemage integration: Automatic upload of generated results\n- i18n support: Korean/English\n\n## Problem\n\n- **AI model diversity**: Different API interfaces, parameters, and timeouts for each model\n- **Storage integration**: External storage integration needed for permanent result storage\n- **Model configuration management**: Need to manage model-specific parameters, UI types, and defaults without code modification\n- **API documentation mismatch**: When managing API docs separately, inconsistencies between code and documentation can occur\n- **Difficulty tracking generation requests**: Hard to monitor success/failure rates and processing delays in real-time\n\n## Solution\n\n- **API call adapter pattern**: Separate adapters per model provider (hf_space, etc.), implement only adapters for new providers\n- **Storage adapter pattern**: Separate external storage integration (Leemage, etc.) into adapters\n- **DB-based model catalog**: Register model settings/parameters via admin UI, add new models without code changes\n- **OpenAPI auto-generation**: Auto-generate OpenAPI spec from Zod schemas for API documentation and type synchronization\n- **Integrated monitoring dashboard**: Real-time view of request status (active/pending/processing), error rates, and avg/P95 latency. Model/API key statistics and daily trend charts\n\n## Impact\n\n- **Cost savings**: Utilizing Hugging Face Space free GPU\n- **Model scalability**: Add new models without code modification via DB model catalog\n- **Storage integration**: Permanent generation history preservation via Leemage integration\n- **Operational visibility**: Real-time monitoring for immediate request status and error rate tracking\n- **Multilingual support**: Korean/English i18n\n\n## Tech Stack\n\n- Frontend: Next.js, TypeScript, Tailwind CSS, shadcn/ui\n- Data/Validation: TanStack Query, Zod\n- Backend/DB: Next.js API Routes, Prisma, PostgreSQL, iron-session\n- AI: Hugging Face Space, Gradio Client\n",
      "width": 512,
      "height": 512
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
