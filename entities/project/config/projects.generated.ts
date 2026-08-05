// 이 파일은 scripts/generate-projects-data.ts 스크립트에 의해 생성되었습니다.
// 직접 수정하지 마세요.

import { GeneratedProjectsMap } from '@/entities/project/model/types'

export const GENERATED_PROJECTS = {
  "ko": {
    "artfolio": {
      "slug": "artfolio",
      "title": "아트폴리오",
      "summary": "AI 기반 예술품 경매 서비스",
      "keyFeatures": [],
      "links": {
        "github": "https://github.com/leey00nsu/ArtFolio-FE"
      },
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
      "draft": true,
      "type": "team",
      "content": "\n## 프로젝트 소개\n\nGitHub : [https://github.com/leey00nsu/ArtFolio-FE](https://github.com/leey00nsu/ArtFolio-FE)\n\nAI 기반 예술품 경매 서비스입니다. 사용자가 그림을 업로드하면 AI가 분석하여 설명과 음성을 자동 생성하고, 실시간 경매 시스템을 통해 거래할 수 있습니다.  \n삼육대학교 SW프로젝트 경진대회에서 장려상을 수상하였으며, 팀 프로젝트에서 **프론트엔드 개발과 팀장을 담당**했습니다.\n\n## 주요 기능\n\n- 웹소켓(Stomp.js)을 활용한 실시간 예술품 경매 및 입찰\n- Nivo를 활용한 경매가 실시간 차트 시각화\n- AI 분석 기반 예술품 평가 및 설명 자동 생성\n\n",
      "width": 2714,
      "height": 1528
    },
    "blog": {
      "slug": "blog",
      "title": "블로그",
      "summary": "다국어(MDX), Studio 편집기, GitHub 자동 커밋, 근거 기반 Q&A 챗봇을 포함한 Next.js 기반 블로그",
      "keyFeatures": [
        "Studio에서 MDX 작성 후 GitHub로 자동 커밋",
        "다국어(MDX) + OpenAI 기반 자동 번역",
        "lexical 검색과 PostgreSQL RAG 기반 블로그 Q&A 챗봇",
        "이미지 메타데이터 자동 주입 및 포트폴리오 PDF 생성"
      ],
      "links": {
        "github": "https://github.com/leey00nsu/leey00nsu-next-blog-v2",
        "demo": "https://blog2.leey00nsu.com"
      },
      "period": {
        "start": "2025-09",
        "end": "2026-04"
      },
      "techStacks": [
        "Next.js",
        "TypeScript",
        "OpenAI API",
        "AI SDK",
        "LangGraph.js",
        "PostgreSQL(pgvector)",
        "Modal",
        "Tailwind CSS",
        "next-intl",
        "Tiptap",
        "NextAuth",
        "Octokit",
        "Playwright"
      ],
      "thumbnail": "/public/projects/blog/logo.webp",
      "draft": false,
      "type": "solo",
      "content": "\n![blog list screen](/public/projects/blog/blog-list-screen.png)\n\n![blog studio editor screen](/public/projects/blog/studio-editor-screen.png)\n\n## 프로젝트 소개\n\nGitHub : [https://github.com/leey00nsu/leey00nsu-next-blog-v2](https://github.com/leey00nsu/leey00nsu-next-blog-v2)\nDemo : [https://blog2.leey00nsu.com](https://blog2.leey00nsu.com)\n\nNext.js 기반의 기술 블로그입니다. 자체 웹 에디터에서 작성한 글을 AI가 한국어/영어로 자동 번역하고, GitHub API를 통해 브랜치에 직접 커밋하여 배포까지 자동화했습니다.\n최근에는 블로그 글, 소개, 프로젝트 문서를 근거로 답하는 Q&A 챗봇을 추가해 방문자가 글을 직접 모두 탐색하지 않아도 블로그의 맥락을 질문으로 찾을 수 있도록 확장했습니다.\n**글쓰기부터 배포, 콘텐츠 탐색까지 이어지는 자동화된 블로그 파이프라인**을 구축한 것이 특징입니다.\n\n## 핵심 기능\n\n- MDX 기반 블로그(코드 하이라이트/이미지 메타데이터 등)\n- Studio 편집기(Tiptap)로 Frontmatter/본문 작성 및 이미지 업로드\n- GitHub API(Octokit)로 MDX/이미지 자동 커밋\n- 다국어(i18n): next-intl + OpenAI 자동 번역\n- AI 이미지 생성(에디터에서 텍스트 선택 후 생성, Leesfield API 키 필요)\n- 블로그 Q&A 챗봇: Question Planner, lexical/curated 검색, PostgreSQL(pgvector) 기반 Graph-RAG, citation 검증\n- Playwright 기반 포트폴리오 PDF 자동 생성\n\n## Problem\n\n- **다국어 콘텐츠 운영 부담**: 한국어/영어를 수동으로 관리하면 누락/불일치가 발생하기 쉬움\n- **배포까지의 마찰**: 작성 → 번역 → 커밋 → 배포 과정이 수작업이면 반복 비용이 큼\n- **콘텐츠 탐색 부담**: 글과 프로젝트가 늘어날수록 방문자가 원하는 맥락을 직접 찾기 어려움\n- **이미지 성능 이슈**: 이미지 크기/플레이스홀더 정보가 없으면 LCP/CLS가 악화되기 쉬움\n- **보안/권한 문제**: 편집 기능을 공개하면 오남용 위험이 있어 접근 제어가 필요\n\n## Solution\n\n- 웹 기반 에디터로 MDX 작성 플로우를 단일화하고, 글 작성 경험을 표준화\n- OpenAI 기반 자동 번역으로 한국어/영어 문서를 동기화\n- GitHub API(Octokit)로 브랜치에 직접 커밋하여 배포 파이프라인을 자동화\n- 이미지 메타데이터(width/height/LQIP)를 사전 생성하여 렌더링 안정성과 성능을 개선\n- 빌드 시 MDX를 lexical 검색 레코드로 만들고, curated source와 PostgreSQL(pgvector) Graph-RAG를 결합해 근거 기반 Q&A 제공\n- 질문 라우터가 direct response, clarification, lexical/semantic retrieval 경로를 먼저 결정하고 citation 검증으로 답변 근거를 제한\n- NextAuth 기반 GitHub OAuth로 Studio 접근을 제한하고, 허용 사용자만 편집 가능하도록 구성\n- Playwright 기반 PDF 생성으로 포트폴리오 산출물을 자동화\n- FSD(Feature-Sliced Design) 구조로 모듈을 분리하여 유지보수성을 확보\n\n## Impact\n\n- **운영 비용 절감**: 다국어 문서와 배포가 자동화되어 반복 작업이 크게 감소\n- **품질/일관성 향상**: 문서/코드/배포 흐름이 연결되어 변경 누락을 줄임\n- **탐색 경험 개선**: 방문자가 블로그 글, 소개, 프로젝트 정보를 질문 형태로 빠르게 확인 가능\n- **웹 성능 개선**: 이미지 렌더링 안정화로 LCP/CLS 개선에 기여\n- **산출물 자동화**: 포트폴리오 PDF를 자동 생성하여 공유/제출이 쉬워짐\n\n",
      "width": 2048,
      "height": 2048
    },
    "day-7": {
      "slug": "day-7",
      "title": "정규직까지 D-7",
      "summary": "선택에 따라 세 가지 결말로 이어지는 AI 영상 기반 인터랙티브 오피스 드라마",
      "keyFeatures": [
        "AI 영상과 자막, 내레이션을 연결한 시네마틱 스토리",
        "플레이어의 선택을 기억해 달라지는 세 가지 엔딩",
        "미디어 사전 다운로드와 스트리밍 폴백을 통한 안정적인 재생"
      ],
      "links": {
        "github": "https://github.com/leey00nsu/day-7",
        "demo": "https://day7.leey00nsu.com/"
      },
      "period": {
        "start": "2026-07",
        "end": "2026-07"
      },
      "techStacks": [
        "Next.js",
        "TypeScript",
        "Zustand",
        "PostgreSQL",
        "Cloudflare R2"
      ],
      "thumbnail": "/public/projects/day-7/og-image.png",
      "draft": true,
      "type": "solo",
      "deployment": {
        "status": "active",
        "kind": "service",
        "category": "interactiveContent",
        "url": "https://day7.leey00nsu.com/",
        "order": 1,
        "coverImage": "/public/projects/day-7/og-image.png"
      },
      "content": "\n![정규직까지 D-7 대표 화면](/public/projects/day-7/og-image.png)\n\n## 프로젝트 소개\n\nGitHub : [https://github.com/leey00nsu/day-7](https://github.com/leey00nsu/day-7)<br />\nDemo : [https://day7.leey00nsu.com/](https://day7.leey00nsu.com/)\n\n정규직 전환 결과 발표를 일주일 앞둔 김 인턴의 선택을 따라가는 **AI 영상 기반 인터랙티브 오피스 드라마**입니다. 월요일의 업무 지시부터 금요일의 최종 면담까지 이어지는 이야기를 영상, 대사 자막, 내레이션과 배경음으로 구성했습니다.\n\n플레이어가 월요일부터 목요일까지 내린 선택을 동료와 게임이 기억하고, 누적된 결정에 따라 서로 다른 세 가지 결말로 이어집니다. 단순히 영상을 순서대로 재생하는 것을 넘어 **선택, 기억, 미디어 재생과 엔딩 수집을 하나의 게임 흐름으로 연결**한 것이 특징입니다.\n\n## 핵심 기능\n\n- 두 개의 비디오 레이어를 교차 사용하는 장면 전환\n- JSON 기반 화자·대사·타임코드 자막과 챕터별 내레이션\n- 선택 결과 피드백과 누적 선택에 따른 세 가지 엔딩 판정\n- 해금한 엔딩과 최근 선택 기록을 확인하는 엔딩 앨범\n- 전체 음량, 배경음, 효과음과 자막 크기 설정\n- 최초 방문 미디어 사전 다운로드와 네트워크 스트리밍 폴백\n- PostgreSQL 기반 플레이별 선택·엔딩 리포트 누적\n- 모바일 화면에서도 전체 영상을 유지하는 레터박스 처리\n\n## Problem\n\n- **영상 사이의 단절**: 여러 장면을 순서대로 재생할 때 소스가 바뀌는 순간 로딩 화면이나 검은 프레임이 노출될 수 있음\n- **선택 상태의 일관성**: 나흘 동안 쌓이는 선택과 피드백, 엔딩 판정을 서로 다른 화면에서도 같은 기준으로 유지해야 함\n- **모바일 미디어 안정성**: 네트워크와 브라우저에 따라 다음 영상의 준비 시점이 달라 단순 스트리밍만으로는 장면 전환 품질을 보장하기 어려움\n- **서로 다른 오디오 수명 주기**: 영상 대사, 내레이션, 배경음과 효과음이 장면 전환과 사용자 설정에 맞춰 함께 동작해야 함\n- **플레이 기록 보존**: 브라우저의 엔딩 해금 상태와 서버의 플레이별 선택 통계를 서로 다른 목적으로 저장해야 함\n\n## Solution\n\n- **이중 비디오 레이어**: 현재 장면과 다음 장면을 두 레이어에 번갈아 준비하여 재생 전환 시 화면이 끊기는 구간을 줄임\n- **콘텐츠와 상태 전이 분리**: 장별 영상·선택지·피드백은 콘텐츠 데이터로 관리하고, 선택 누적과 엔딩 판정은 순수 상태 전이 규칙으로 분리\n- **미디어 매니페스트와 재생 폴백**: 약 36MB의 영상·오디오를 사용자의 동의 후 세션 Blob URL로 준비하고, 다운로드하지 않거나 실패하면 스트리밍으로 전환\n- **범위가 다른 Zustand Store**: 영속해야 하는 음량·자막 설정은 persist store에, 한 번의 플레이에만 필요한 진행 상태는 페이지 수명 store에 저장\n- **클라이언트와 서버 기록 분리**: 엔딩 해금과 최근 엔딩은 `localStorage`에 보관하고, 플레이별 선택과 도달 엔딩은 PostgreSQL에 누적\n- **반응형 영상 영역**: 모바일에서도 영상 전체를 유지하도록 레터박스를 적용하고 재생 중 옵션을 변경할 수 있게 구성\n\n## Impact\n\n- **연속적인 스토리 경험**: 프롤로그부터 금요일 면담까지 영상, 자막과 오디오가 하나의 장면처럼 이어지는 플레이 흐름 구현\n- **선택의 결과 가시화**: 네 번의 선택을 세 가지 엔딩과 엔딩 앨범으로 연결해 반복 플레이 동기 제공\n- **재생 환경 대응**: 사전 다운로드와 스트리밍 폴백을 함께 제공해 데스크톱·모바일의 서로 다른 네트워크 조건에 대응\n- **콘텐츠 유지보수성 확보**: 스토리 데이터, 상태 전이와 미디어 제어를 분리하여 장면과 선택지를 코드 전반을 수정하지 않고 관리 가능\n- **플레이 데이터 축적**: 브라우저별 익명 식별자를 사용해 반복 플레이의 선택과 엔딩을 서버에서 분석할 수 있는 기반 마련\n",
      "width": 1200,
      "height": 630
    },
    "lee-spec-kit": {
      "slug": "lee-spec-kit",
      "title": "lee-spec-kit",
      "summary": "AI 에이전트 기반 개발을 위한 프로젝트 문서 구조 생성 CLI",
      "keyFeatures": [
        "Spec-driven development 워크플로우 템플릿화",
        "Feature 단위 문서 구조화로 진행/리뷰/히스토리 추적 단순화",
        "에이전트 컨텍스트/상태 요약 및 문서 구조 검증으로 협업 안정화"
      ],
      "links": {
        "github": "https://github.com/leey00nsu/lee-spec-kit",
        "npm": "https://www.npmjs.com/package/lee-spec-kit"
      },
      "period": {
        "start": "2025-12",
        "end": "2026-02"
      },
      "techStacks": [
        "Node.js",
        "TypeScript"
      ],
      "thumbnail": "/public/projects/lee-spec-kit/logo.png",
      "draft": false,
      "type": "solo",
      "deployment": {
        "status": "maintained",
        "kind": "package",
        "category": "developerTool",
        "url": "https://www.npmjs.com/package/lee-spec-kit",
        "order": 5,
        "coverImage": "/public/projects/lee-spec-kit/spec-workflow.png"
      },
      "content": "\n![lee-spec-kit 문서 워크플로우](/public/projects/lee-spec-kit/spec-workflow.png)\n\n## 프로젝트 소개\n\nGitHub : [https://github.com/leey00nsu/lee-spec-kit](https://github.com/leey00nsu/lee-spec-kit)  \nnpm : [https://www.npmjs.com/package/lee-spec-kit](https://www.npmjs.com/package/lee-spec-kit)\n\nAI 에이전트(코드 어시스턴트)와 함께 개발할 때, 문서 구조/규칙/진행 상태가 팀·레포마다 달라지면 컨텍스트 전달 비용이 크게 늘어납니다.  \n`lee-spec-kit`은 **AI 보조 개발을 위한 문서 구조를 빠르게 생성하고, Feature 단위 워크플로우를 일관되게 유지**하기 위해 만든 CLI입니다.\nspec-kit의 문서 구조와 워크플로우를 참고하여, Spec-driven development(스펙 기반 개발)를 프로젝트에 쉽게 적용할 수 있도록 설계했습니다.\n\n## 핵심 기능\n\n- Spec-driven development 워크플로우 고정: Feature마다 스펙 → 플랜 → 태스크 → 결정 기록 흐름을 표준화하여 “무엇/왜/어떻게/무엇을 했는지”가 문서로 남습니다.\n- 문서 구조 표준화: 프로젝트 문서 루트의 기본 골격(agents/prd/features 등)과 공용 템플릿을 제공해 문서의 형태와 품질을 일정하게 유지합니다.\n- Feature 중심 문서 관리: 기능 단위 폴더 단위로 진행 상황을 한눈에 파악하고, 리뷰·우선순위·히스토리 추적을 쉽게 만듭니다.\n- 에이전트 친화적 컨텍스트: 현재 작업 중인 Feature의 핵심 정보와 다음 액션을 출력하여, 사람·에이전트가 동일한 프로세스를 따르게 합니다.\n- 템플릿 업데이트: 문서 템플릿/가이드(agents, skills 등)를 최신 상태로 유지할 수 있도록 업데이트 경로를 제공합니다.\n\n## Problem\n\n- **에이전트 컨텍스트 비용**: 문서 구조/규칙이 프로젝트마다 달라 매번 설명이 필요\n- **워크플로우 일관성 부재**: 스펙/플랜/태스크/결정 기록이 흩어져 리뷰·진행 추적이 어려움\n- **문서 품질 관리 어려움**: 누락 파일/상태, 중복 ID, placeholder 등이 누적됨\n\n## Solution\n\n- 프로젝트 문서의 기본 골격과 공용 템플릿을 제공하여 문서 구조를 고정\n- Feature 단위 산출물(`spec.md`, `plan.md`, `tasks.md`, `decisions.md`)을 자동으로 생성해 SDD 흐름을 유지\n- 현재 상태/다음 액션을 요약 출력하고 JSON 출력으로 자동화 파이프라인에 연동\n- 구조·메타데이터를 검증하고 템플릿을 최신화하여 문서 품질을 지속적으로 유지\n\n## Impact\n\n- **온보딩/커뮤니케이션 비용 감소**: 문서 구조가 통일되어 컨텍스트 전달이 단순화\n- **Feature 단위 진행 가시성 확보**: 워크플로우가 템플릿화되어 상태 파악/리뷰가 쉬워짐\n- **문서 품질 유지**: 구조/메타데이터 검증으로 오류를 빠르게 차단\n",
      "width": 692,
      "height": 730
    },
    "leemage": {
      "slug": "leemage",
      "title": "Leemage",
      "summary": "멀티 스토리지 기반 파일·이미지 관리 플랫폼",
      "keyFeatures": [
        "프로젝트 단위 파일 업로드/관리 (이미지·비디오·문서 등 모든 확장자 지원)",
        "멀티 스토리지(OCI / Cloudflare R2) 어댑터",
        "외부 API/TypeScript SDK 제공"
      ],
      "links": {
        "github": "https://github.com/leey00nsu/leemage",
        "demo": "https://leemage.leey00nsu.com/"
      },
      "period": {
        "start": "2025-05",
        "end": "2026-01"
      },
      "techStacks": [
        "Next.js",
        "TypeScript",
        "PostgreSQL",
        "Tailwind CSS",
        "Prisma",
        "OCI Object Storage",
        "Cloudflare R2",
        "Sharp",
        "TanStack Query",
        "Zod"
      ],
      "thumbnail": "/public/projects/leemage/cloudy.png",
      "draft": false,
      "type": "solo",
      "deployment": {
        "status": "active",
        "kind": "service",
        "category": "infrastructure",
        "url": "https://leemage.leey00nsu.com/",
        "order": 4,
        "coverImage": "/public/projects/leemage/project-detail-grid.png"
      },
      "content": "\n![Leemage project detail](/public/projects/leemage/project-detail-grid.png)\n\n![Leemage file detail](/public/projects/leemage/file-detail-image.png)\n\n![Leemage monitoring dashboard](/public/projects/leemage/monitoring-30d.png)\n\n## 프로젝트 소개\n\nGitHub : [https://github.com/leey00nsu/leemage](https://github.com/leey00nsu/leemage)\nDemo : [https://leemage.leey00nsu.com/](https://leemage.leey00nsu.com/)\n\n사이드 프로젝트에 파일 업로드 기능을 추가할 때 비용 문제가 발생했습니다.\n**OCI Object Storage / Cloudflare R2**는 Free Tier로 일정 용량을 무료로 제공하기 때문에, Cloudinary 같은 유료 서비스 대신 **비용 절감을 위한 자체 호스팅 파일 관리 플랫폼**을 구축했습니다.\n프로젝트 단위로 파일을 정리하고, 외부 API와 SDK를 통해 다른 프로젝트에 빠르게 통합할 수 있습니다.\n\n## 핵심 기능\n\n- 프로젝트 단위 파일 업로드/관리: 이미지·비디오·문서 등 모든 확장자 지원\n- 이미지 변환 옵션 제공: 리사이즈/포맷 변환\n- 외부 API/SDK 제공: RESTful API 및 TypeScript SDK 제공\n- OpenAPI 문서 자동화: Zod 스키마에서 OpenAPI 스펙 자동 생성\n- 멀티 스토리지 지원: OCI Object Storage / Cloudflare R2 선택 가능\n- i18n 지원: 한국어/영어 제공\n\n## Problem\n\n- **대용량 파일 업로드 시 서버 부하**: 파일이 서버를 거치면 메모리/네트워크 부하 급증\n- **멀티 스토리지 API 차이**: OCI Object Storage와 Cloudflare R2는 API 인터페이스가 상이하여 프로바이더 변경 시 코드 전체 수정 부담\n- **이미지 용량 최적화**: 무거운 이미지 리사이징/포맷 변환 필요\n- **API 문서 불일치**: API 문서를 별도 관리할 경우 코드와 문서 간 불일치 발생 가능\n\n## Solution\n\n- **Presigned URL 직접 업로드**: 클라이언트가 스토리지에 직접 업로드하여 서버 부하 제거\n- **Storage Adapter 패턴**: 공통 인터페이스로 프로바이더 독립적인 코드 작성, 새 프로바이더 추가 시 어댑터만 구현 (OCP 준수)\n- **Sharp 기반 이미지 변환**: 병렬 처리로 여러 variant 동시 생성, WebP/AVIF의 가벼운 차세대 포맷 지원\n- **TypeScript SDK**: 복잡한 3단계 업로드 플로우(presign → upload → confirm)를 단일 메서드로 추상화\n- **OpenAPI 자동 생성**: Zod 스키마에서 OpenAPI 스펙 자동 생성으로 API 문서와 타입 동기화\n\n## Impact\n\n- **서버 부하**: Presigned URL로 파일 전송 서버 부하 0%\n- **이미지 용량 최적화**: WebP/AVIF 변환으로 원본 대비 50-60% 감소\n- **비용 절감**: OCI, Cloudflare R2 Free Tier 활용\n- **통합 용이성**: TypeScript SDK로 외부 프로젝트에 빠른 통합 가능\n",
      "width": 1024,
      "height": 1024
    },
    "leesfield": {
      "slug": "leesfield",
      "title": "Leesfield",
      "summary": "AI 이미지/비디오 생성 플랫폼",
      "keyFeatures": [
        "어댑터 패턴 기반 이미지/비디오 생성 (현재는 Hugging Face Space 어댑터 제공)",
        "모니터링 대시보드 제공",
        "외부 API 제공"
      ],
      "links": {
        "github": "https://github.com/leey00nsu/leesfield",
        "demo": "https://leesfield.leey00nsu.com/"
      },
      "period": {
        "start": "2026-01",
        "end": "2026-02"
      },
      "techStacks": [
        "Next.js",
        "TypeScript",
        "PostgreSQL",
        "Tailwind CSS",
        "shadcn/ui",
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
      "deployment": {
        "status": "active",
        "kind": "service",
        "category": "aiService",
        "url": "https://leesfield.leey00nsu.com/",
        "order": 3,
        "coverImage": "/public/projects/leesfield/landing.png"
      },
      "content": "\n![leesfield landing page](/public/projects/leesfield/landing.png)\n\n![leesfield image generation page](/public/projects/leesfield/image-generation.png)\n\n## 프로젝트 소개\n\nGitHub : [https://github.com/leey00nsu/leesfield](https://github.com/leey00nsu/leesfield)\nDemo : [https://leesfield.leey00nsu.com/](https://leesfield.leey00nsu.com/)\n\n사이드 프로젝트에 AI 이미지/비디오 생성 기능을 추가할 때 **자체 파이프라인**을 구축하고 싶었습니다.\n대부분의 이미지/비디오 생성 API는 유료로 제공되지만, **Hugging Face Zero GPU**는 제한적이지만 무료로 사용할 수 있어 비용 부담 없이 시작할 수 있었습니다.\n\n현재는 Hugging Face 어댑터만 구현되어 있지만, **어댑터 패턴으로 설계**되어 추후 다른 AI API(OpenAI, Replicate 등)도 쉽게 연동할 수 있습니다.\n다양한 AI 모델(FLUX 등)을 통합 UI/API로 제공하고, Leemage와 연동하여 생성된 결과를 자동으로 스토리지에 저장합니다.\n\n## 핵심 기능\n\n- AI 이미지/비디오 생성: 어댑터 기반 확장 가능 (현재 무료 Hugging Face Space 어댑터 제공)\n- 모델 카탈로그 관리: DB 기반 모델 등록/수정, 동적 UI 렌더링\n- 모니터링 대시보드: 생성 요청 현황 및 상태 모니터링\n- 생성 히스토리 관리: 모든 생성 요청 DB 저장\n- 외부 API 제공: Zod 스키마 기반 OpenAPI 자동 생성\n- Leemage 연동: 생성 결과 자동 업로드\n- i18n 지원: 한국어/영어 제공\n\n## Problem\n\n- **AI 모델 다양성**: 모델마다 API 인터페이스, 파라미터, 타임아웃이 상이\n- **스토리지 연동**: 생성 결과를 영구 저장하려면 외부 스토리지 연동 필요\n- **모델 설정 관리**: 모델별 파라미터, UI 타입, 기본값을 코드 수정 없이 관리 필요\n- **API 문서 불일치**: API 문서를 별도 관리할 경우 코드와 문서 간 불일치 발생 가능\n- **생성 요청 상태 파악 어려움**: AI 생성 요청의 성공/실패 현황, 처리 지연 여부를 실시간으로 파악하기 어려움\n\n## Solution\n\n- **API 호출 어댑터 패턴**: 모델 프로바이더(hf_space 등)별 어댑터 분리, 새 프로바이더 추가 시 어댑터만 구현\n- **Storage 어댑터 패턴**: Leemage 등 외부 스토리지 연동을 어댑터로 분리\n- **DB 기반 모델 카탈로그**: 관리 화면에서 모델 설정/파라미터 등록, 코드 수정 없이 모델 추가\n- **OpenAPI 자동 생성**: Zod 스키마에서 OpenAPI 스펙 자동 생성으로 API 문서와 타입 동기화\n- **통합 모니터링 대시보드**: 요청 현황(active/pending/processing), 에러율, 평균/P95 레이턴시를 실시간 조회. 모델별/API 키별 통계 및 일별 추이 차트 제공\n\n## Impact\n\n- **비용 절감**: Hugging Face Space 무료 GPU 활용\n- **모델 확장성**: DB 모델 카탈로그로 코드 수정 없이 새 모델 추가 가능\n- **저장소 연동**: Leemage 연동으로 생성 히스토리 영구 보존\n- **운영 가시성 확보**: 실시간 모니터링으로 요청 현황 및 에러율 즉시 확인 가능\n- **다국어 지원**: 한국어/영어 i18n\n",
      "width": 512,
      "height": 512
    },
    "stock-aquarium": {
      "slug": "stock-aquarium",
      "title": "Stock Aquarium",
      "summary": "실시간 주식 체결 데이터를 3D 수조 속 물고기로 표현한 데이터 시각화 서비스",
      "keyFeatures": [
        "매수·매도 방향과 체결량을 물고기의 색상과 크기로 표현",
        "KIS WebSocket 데이터를 단일 서버 연결과 SSE로 재배포",
        "객체 풀을 활용해 고빈도 체결에서도 안정적인 3D 렌더링"
      ],
      "links": {
        "github": "https://github.com/leey00nsu/stock-aquarium",
        "demo": "https://aquarium.leey00nsu.com/"
      },
      "period": {
        "start": "2026-07",
        "end": "2026-07"
      },
      "techStacks": [
        "Next.js",
        "TypeScript",
        "Three.js",
        "React Three Fiber",
        "Server-Sent Events"
      ],
      "thumbnail": "/public/projects/stock-aquarium/stock-aquarium-icon.png",
      "draft": true,
      "type": "solo",
      "deployment": {
        "status": "active",
        "kind": "service",
        "category": "dataVisualization",
        "url": "https://aquarium.leey00nsu.com/",
        "order": 2,
        "coverImage": "/public/projects/stock-aquarium/stock-aquarium-screen.png"
      },
      "content": "\n![Stock Aquarium 실시간 수조 화면](/public/projects/stock-aquarium/stock-aquarium-screen.png)\n\n## 프로젝트 소개\n\nGitHub : [https://github.com/leey00nsu/stock-aquarium](https://github.com/leey00nsu/stock-aquarium)<br />\nDemo : [https://aquarium.leey00nsu.com/](https://aquarium.leey00nsu.com/)\n\n한국투자증권(KIS)의 실시간 주식 체결 데이터를 **3D 수조 속 물고기 움직임으로 변환한 데이터 시각화 서비스**입니다. 매수 체결은 오른쪽으로 이동하는 빨간 물고기, 매도 체결은 왼쪽으로 이동하는 파란 물고기로 표현하고 체결량에 따라 크기를 조절합니다.\n\n숫자와 차트 중심의 시세 화면 대신 시장의 방향, 체결 강도, 거래량과 변동성을 하나의 수중 환경으로 보여주는 것이 목적입니다. 거래량이 늘면 물고기와 입자가 빨라지고, 변동성이 커지면 수조에 폭풍과 카메라 흔들림이 발생합니다.\n\n## 핵심 기능\n\n- 매수·매도 체결 방향과 규모를 물고기의 이동 방향, 색상, 크기로 시각화\n- 거래량 급증, 변동성 확대와 거래정지를 수중 환경 변화로 표현\n- 국내·미국 주요 40개 종목 검색과 실시간 현재가 조회\n- 단일 KIS WebSocket 연결을 여러 브라우저에 SSE로 팬아웃\n- 100ms 단위 체결 집계와 250ms 단위 물고기 생성량 제어\n- 80개 고정 객체 풀과 단일 프레임 루프를 사용한 3D 렌더링\n- 서버 메모리·디스크를 조합한 종목 마스터 이중 캐시\n- 목 시세 모드와 실제 KIS 실전·모의투자 데이터 전환\n\n## Problem\n\n- **고빈도 체결 데이터**: 순간적으로 많은 체결이 들어오면 브라우저마다 WebSocket을 열거나 이벤트마다 3D 객체를 생성하는 방식은 서버와 렌더링 부하가 큼\n- **종목별 유동성 차이**: 절대 체결량만 사용하면 거래량이 큰 종목과 작은 종목의 물고기 크기를 같은 기준으로 비교하기 어려움\n- **실시간 연결 공유**: 같은 종목을 보는 사용자가 늘어날 때 KIS 구독과 JSON 직렬화를 사용자 수만큼 반복하지 않아야 함\n- **3D 객체 수명 관리**: 물고기 모델, 스켈레톤 애니메이션과 이동 상태를 계속 생성·제거하면 프레임 드롭과 메모리 부담이 발생\n- **운영 보안과 복구**: KIS 자격 증명을 브라우저에 노출하지 않으면서 연결 제한, 재연결과 종목 데이터 장애에 대응해야 함\n\n## Solution\n\n- **서버 전용 KIS 게이트웨이**: KIS App Key와 Secret은 서버에서만 사용하고, 하나의 WebSocket 연결에서 받은 체결을 Next.js Route Handler의 SSE로 재배포\n- **종목 단위 팬아웃**: 체결 데이터의 집계와 JSON 직렬화를 종목별로 한 번만 수행하고 동일 종목을 구독한 모든 브라우저가 같은 SSE 바이트를 공유\n- **상대적 체결량 계산**: 종목별 최근 40개 체결량의 백분위로 물고기 크기를 0.6~2.5배 범위에 매핑하여 유동성이 다른 종목도 일관된 크기로 표현\n- **고정 객체 풀**: 시작 시 80개의 물고기를 준비해 재사용하고, 한도를 넘는 체결은 버리지 않고 방향별 수량과 횟수로 합산해 다음 객체에 반영\n- **연결 보호와 자동 복구**: 전체·IP별 연결 및 재시도 제한을 적용하고, KIS 연결이 끊기면 지수 백오프로 재연결한 뒤 사용 중인 종목만 다시 구독\n- **이중 캐시와 폴백**: 종목 마스터를 서버 메모리에 24시간 보관하고 디스크 캐시를 함께 사용하며, 미국 순위 조회가 실패하면 내장 대표 종목 목록으로 시작\n\n## Impact\n\n- **실시간 데이터의 직관적 표현**: 매수·매도 방향, 체결 규모와 시장 변화를 숫자를 읽지 않아도 수조의 움직임으로 파악 가능\n- **구독 자원 절감**: 같은 종목을 100명이 보더라도 서버의 KIS 실시간 구독은 한 건만 유지하도록 구성\n- **안정적인 렌더링 상한**: 최대 80개의 물고기를 재사용해 체결량이 급증해도 무제한으로 3D 객체가 늘어나지 않도록 제한\n- **데이터 유실 완화**: 생성 속도를 넘는 체결을 방향별로 합산하여 시각적 이벤트 수는 줄이되 체결량 정보는 다음 물고기에 반영\n- **운영 가능한 실시간 서비스**: 재연결, keep-alive, 요청 제한, 보안 헤더와 캐시 폴백을 포함해 장시간 연결을 전제로 한 운영 기반 구축\n",
      "width": 512,
      "height": 512
    },
    "syu-character-maker": {
      "slug": "syu-character-maker",
      "title": "나만의 수야,수호 만들기",
      "summary": "삼육대 마스코트 꾸미기, 공유 웹 프로그램",
      "keyFeatures": [],
      "links": {
        "github": "https://github.com/leey00nsu/syu-character-maker"
      },
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
      "draft": true,
      "type": "solo",
      "deployment": {
        "status": "maintained",
        "kind": "service",
        "category": "interactiveWeb",
        "url": "https://character-maker.leey00nsu.com/",
        "order": 6,
        "coverImage": "/public/projects/syu-character-maker/syu-character-maker.webp"
      },
      "content": "\n## 프로젝트 소개\n\nGitHub : [https://github.com/leey00nsu/syu-character-maker](https://github.com/leey00nsu/syu-character-maker)\n\n삼육대학교 마스코트 **수야/수호를 꾸밀 수 있는 웹 프로그램**입니다.  \n학생들이 자유롭게 캐릭터를 꾸미고 결과를 이미지로 저장하거나 학우들과 공유할 수 있도록 했습니다.\n\n## 주요 기능\n\n- React-konva 캔버스 기반 꾸미기 도구(펜, 스티커 등)\n- 결과물 이미지 다운로드 및 업로드 공유\n- Zustand + TanStack Query 기반 상태 관리 및 최적화\n",
      "width": 2578,
      "height": 1810
    }
  },
  "en": {
    "artfolio": {
      "slug": "artfolio",
      "title": "ArtFolio",
      "summary": "AI-powered art auction service",
      "keyFeatures": [],
      "links": {
        "github": "https://github.com/leey00nsu/ArtFolio-FE"
      },
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
      "draft": true,
      "type": "team",
      "content": "\n## Project Overview\n\nGitHub : [https://github.com/leey00nsu/ArtFolio-FE](https://github.com/leey00nsu/ArtFolio-FE)\n\nThis is an AI-powered art auction service. When a user uploads a painting, the AI analyzes it and automatically generates descriptions and audio, and items can be traded through a real-time auction system.  \nThe project won the Encouragement Award at the Sahmyook University SW Project Competition, and I served as the team lead and was responsible for **frontend development and team leadership**.\n\n## Key Features\n\n- Real-time art auctions and bidding using WebSockets (Stomp.js)\n- Real-time auction price chart visualization using Nivo\n- AI-driven artwork evaluation and automatic generation of descriptions\n\n",
      "width": 2714,
      "height": 1528
    },
    "blog": {
      "slug": "blog",
      "title": "Blog",
      "summary": "A Next.js blog with multilingual MDX, Studio editor, GitHub auto-commit, and grounded Q&A chatbot",
      "keyFeatures": [
        "Author MDX in Studio and auto-commit to GitHub",
        "Multilingual MDX with OpenAI-powered translation",
        "Blog Q&A chatbot powered by lexical search and PostgreSQL RAG",
        "Automatic image metadata injection and portfolio PDF generation"
      ],
      "links": {
        "github": "https://github.com/leey00nsu/leey00nsu-next-blog-v2",
        "demo": "https://blog2.leey00nsu.com"
      },
      "period": {
        "start": "2025-09",
        "end": "2026-04"
      },
      "techStacks": [
        "Next.js",
        "TypeScript",
        "OpenAI API",
        "AI SDK",
        "LangGraph.js",
        "PostgreSQL(pgvector)",
        "Modal",
        "Tailwind CSS",
        "next-intl",
        "Tiptap",
        "NextAuth",
        "Octokit",
        "Playwright"
      ],
      "thumbnail": "/public/projects/blog/logo.webp",
      "draft": false,
      "type": "solo",
      "content": "\n![blog list screen](/public/projects/blog/blog-list-screen.png)\n\n![blog studio editor screen](/public/projects/blog/studio-editor-screen.png)\n\n## Project Overview\n\nGitHub : [https://github.com/leey00nsu/leey00nsu-next-blog-v2](https://github.com/leey00nsu/leey00nsu-next-blog-v2)\nDemo : [https://blog2.leey00nsu.com](https://blog2.leey00nsu.com)\n\nThis is a technology blog built with Next.js. Articles written in the built-in web editor are automatically translated between Korean and English by AI, and are committed directly to a branch via the GitHub API to automate deployment.\nRecently, I added a grounded Q&A chatbot that answers from blog posts, profile content, and project documents, so visitors can ask for context instead of manually browsing every article.\n**An automated blog pipeline from writing and deployment to content discovery** is a key feature.\n\n## Key Features\n\n- MDX-based blog (syntax highlighting, image metadata, etc.)\n- Studio editor (Tiptap) for authoring frontmatter/body and uploading images\n- GitHub API (Octokit) auto-commit for MDX/images\n- i18n: next-intl + OpenAI-powered translation\n- AI image generation from selected text (requires a Leesfield API key)\n- Blog Q&A chatbot: Question Planner, lexical/curated search, PostgreSQL(pgvector) Graph-RAG, citation validation\n- Playwright-based portfolio PDF generation\n\n## Problem\n\n- **Overhead of multilingual content**: Manually maintaining Korean and English versions leads to drift and omissions\n- **Friction to deployment**: A manual write → translate → commit → deploy loop is repetitive and error-prone\n- **Content discovery overhead**: As posts and projects grow, visitors need a faster way to find the right context\n- **Image performance issues**: Missing sizing/placeholder metadata can easily degrade LCP/CLS\n- **Access control**: Editing capabilities need protection to prevent abuse\n\n## Solution\n\n- Standardize the authoring flow with a web-based MDX editor\n- Synchronize Korean/English content with OpenAI-powered translation\n- Automate commits to a branch via GitHub API (Octokit) to streamline deployment\n- Pre-generate image metadata (width/height/LQIP) to stabilize rendering and improve performance\n- Generate lexical search records from MDX at build time, then combine curated sources with PostgreSQL(pgvector) Graph-RAG for grounded Q&A\n- Use a question router to choose direct response, clarification, or lexical/semantic retrieval first, then restrict answers through citation validation\n- Restrict Studio access via GitHub OAuth (NextAuth) with an allowlist approach\n- Automate portfolio PDF output with a Playwright-based pipeline\n- Improve maintainability by structuring the codebase with Feature-Sliced Design (FSD)\n\n## Impact\n\n- **Lower ops cost**: Less repetitive work thanks to automated translation and deployment\n- **Better consistency**: Tighter coupling between docs, code, and deployment reduces missed updates\n- **Better discovery**: Visitors can quickly ask about blog posts, profile content, and projects in natural language\n- **Improved web performance**: More stable image rendering contributes to better LCP/CLS\n- **Automated deliverables**: Portfolio PDFs are generated automatically for easy sharing\n\n",
      "width": 2048,
      "height": 2048
    },
    "day-7": {
      "slug": "day-7",
      "title": "Seven Days to Full-Time",
      "summary": "An interactive AI-video office drama where your choices lead to one of three endings",
      "keyFeatures": [
        "A cinematic story combining AI video, captions, narration, and music",
        "Three endings shaped by decisions remembered throughout the story",
        "Reliable playback through media preloading and a streaming fallback"
      ],
      "links": {
        "github": "https://github.com/leey00nsu/day-7",
        "demo": "https://day7.leey00nsu.com/"
      },
      "period": {
        "start": "2026-07",
        "end": "2026-07"
      },
      "techStacks": [
        "Next.js",
        "TypeScript",
        "Zustand",
        "PostgreSQL",
        "Cloudflare R2"
      ],
      "thumbnail": "/public/projects/day-7/og-image.png",
      "draft": true,
      "type": "solo",
      "deployment": {
        "status": "active",
        "kind": "service",
        "category": "interactiveContent",
        "url": "https://day7.leey00nsu.com/",
        "order": 1,
        "coverImage": "/public/projects/day-7/og-image.png"
      },
      "content": "\n![Seven Days to Full-Time main screen](/public/projects/day-7/og-image.png)\n\n## Project Overview\n\nGitHub: [https://github.com/leey00nsu/day-7](https://github.com/leey00nsu/day-7)<br />\nDemo: [https://day7.leey00nsu.com/](https://day7.leey00nsu.com/)\n\nAn **AI-video interactive office drama** that follows an intern during the final week before a full-time employment decision. The story runs from an unsettling assignment on Monday to the final interview on Friday, combining video, timed dialogue captions, narration, and music.\n\nThe game remembers every decision made from Monday through Thursday. Those accumulated choices shape one of three endings. Rather than simply playing videos in order, the project connects **choice, memory, media playback, and ending collection into one game flow**.\n\n## Key Features\n\n- Seamless scene transitions using alternating video layers\n- JSON-based speakers, dialogue captions, timecodes, and chapter narration\n- Choice feedback and three endings determined by accumulated decisions\n- An ending album that stores unlocked endings and recent choices\n- Controls for master volume, music, sound effects, and caption size\n- First-visit media preloading with a network streaming fallback\n- PostgreSQL reports that accumulate choices and endings per playthrough\n- Letterboxed video that preserves the full frame on mobile screens\n\n## Problem\n\n- **Gaps between videos**: Switching sources between multiple scenes can expose loading states or black frames.\n- **Consistent choice state**: Decisions, feedback, and ending evaluation must use the same state across several screens and four in-story days.\n- **Reliable mobile playback**: Network and browser differences make it difficult to guarantee smooth transitions with streaming alone.\n- **Different audio lifecycles**: Dialogue, narration, music, and sound effects must stay synchronized with scene changes and player preferences.\n- **Play history persistence**: Browser-side ending progress and server-side playthrough reports need different storage lifecycles.\n\n## Solution\n\n- **Alternating video layers**: Prepare the current and next scenes on two video layers and swap them to reduce visible gaps during transitions.\n- **Separate content from state transitions**: Keep scene videos, choices, and feedback in content data while implementing choice accumulation and ending evaluation as pure state rules.\n- **Media manifest and playback fallback**: With player consent, preload about 36 MB of video and audio as session Blob URLs; fall back to streaming when preparation is declined or fails.\n- **Scoped Zustand stores**: Persist volume and caption preferences while keeping one playthrough's story progress in a page-lifetime store.\n- **Separate client and server records**: Store unlocked and recent endings in `localStorage`, while accumulating every playthrough's choices and ending in PostgreSQL.\n- **Responsive video stage**: Preserve the entire video frame with letterboxing on mobile and allow settings to change during playback.\n\n## Impact\n\n- **Continuous story experience**: Video, captions, narration, and music flow from the prologue through Friday's final interview as a cohesive scene.\n- **Visible consequences**: Four accumulated choices lead to three endings and an ending album, encouraging repeat playthroughs.\n- **Playback across environments**: Preloading and streaming fallback support different desktop and mobile network conditions.\n- **Maintainable content model**: Separating story data, state transitions, and media control makes scenes and choices easier to update.\n- **Playthrough analytics foundation**: Anonymous browser identifiers allow repeated choices and endings to be accumulated for later analysis.\n",
      "width": 1200,
      "height": 630
    },
    "lee-spec-kit": {
      "slug": "lee-spec-kit",
      "title": "lee-spec-kit",
      "summary": "CLI to generate a project docs structure for AI-assisted development",
      "keyFeatures": [
        "Spec-driven development workflow templates",
        "Feature-based documentation for simpler progress/review/history tracking",
        "Agent-friendly context/status summaries and doc structure validation"
      ],
      "links": {
        "github": "https://github.com/leey00nsu/lee-spec-kit",
        "npm": "https://www.npmjs.com/package/lee-spec-kit"
      },
      "period": {
        "start": "2025-12",
        "end": "2026-02"
      },
      "techStacks": [
        "Node.js",
        "TypeScript"
      ],
      "thumbnail": "/public/projects/lee-spec-kit/logo.png",
      "draft": false,
      "type": "solo",
      "deployment": {
        "status": "maintained",
        "kind": "package",
        "category": "developerTool",
        "url": "https://www.npmjs.com/package/lee-spec-kit",
        "order": 5,
        "coverImage": "/public/projects/lee-spec-kit/spec-workflow.png"
      },
      "content": "\n![lee-spec-kit documentation workflow](/public/projects/lee-spec-kit/spec-workflow.png)\n\n## Project Overview\n\nGitHub : [https://github.com/leey00nsu/lee-spec-kit](https://github.com/leey00nsu/lee-spec-kit)  \nnpm : [https://www.npmjs.com/package/lee-spec-kit](https://www.npmjs.com/package/lee-spec-kit)\n\nWhen working with AI coding assistants, the biggest bottleneck often becomes **inconsistent documentation structure and missing context** across projects.  \n`lee-spec-kit` is a CLI that helps you **bootstrap a predictable docs structure** and keep a consistent feature workflow (`spec → plan → tasks → decisions`) so both humans and agents can collaborate with less friction.\nBased on spec-kit’s docs structure and workflow, it was designed to make Spec-driven development (SDD) easy to adopt in real projects.\n\n## Key Features\n\n- Enforces Spec-driven development workflow: standardizes the “spec → plan → tasks → decisions” flow per feature so intent, design, execution, and decisions stay traceable.\n- Standardized docs structure: provides a consistent docs skeleton (agents/prd/features, shared templates) to keep documentation shape and quality predictable.\n- Feature-centric doc management: organizes artifacts in per-feature folders so progress is visible at a glance and review, prioritization, and history tracking are straightforward.\n- Agent-friendly context: outputs the current feature’s key context and next actions so humans and agents follow the same process.\n- Template updates: provides a maintenance path to keep templates and guides (agents, skills, etc.) up to date.\n\n## Problem\n\n- **Context overhead for agents**: documentation structure and conventions vary across projects\n- **Fragmented workflow**: spec/plan/tasks/decisions are scattered, making reviews and progress tracking harder\n- **Doc quality drift**: missing files/status, duplicate IDs, and leftover placeholders accumulate over time\n\n## Solution\n\n- Provide a standardized docs skeleton and shared templates to keep documentation structure consistent\n- Automatically scaffold feature artifacts (`spec.md`, `plan.md`, `tasks.md`, `decisions.md`) to preserve the SDD flow\n- Summarize current state/next actions and integrate with automation via JSON output\n- Validate structure/metadata and keep templates up to date to prevent documentation drift\n\n## Impact\n\n- **Lower onboarding/communication cost**: standardized docs make context sharing simpler\n- **Better feature visibility**: templated workflow keeps progress consistent and reviewable\n- **Sustained doc quality**: automated validation catches structural/metadata issues early\n",
      "width": 692,
      "height": 730
    },
    "leemage": {
      "slug": "leemage",
      "title": "Leemage",
      "summary": "Multi-storage based file and image management platform",
      "keyFeatures": [
        "Project-based file upload/management (images, videos, documents, and more)",
        "Multi-storage adapters (OCI / Cloudflare R2)",
        "External API and TypeScript SDK"
      ],
      "links": {
        "github": "https://github.com/leey00nsu/leemage",
        "demo": "https://leemage.leey00nsu.com/"
      },
      "period": {
        "start": "2025-05",
        "end": "2026-01"
      },
      "techStacks": [
        "Next.js",
        "TypeScript",
        "PostgreSQL",
        "Tailwind CSS",
        "Prisma",
        "OCI Object Storage",
        "Cloudflare R2",
        "Sharp",
        "TanStack Query",
        "Zod"
      ],
      "thumbnail": "/public/projects/leemage/cloudy.png",
      "draft": false,
      "type": "solo",
      "deployment": {
        "status": "active",
        "kind": "service",
        "category": "infrastructure",
        "url": "https://leemage.leey00nsu.com/",
        "order": 4,
        "coverImage": "/public/projects/leemage/project-detail-grid.png"
      },
      "content": "\n![Leemage project detail](/public/projects/leemage/project-detail-grid.png)\n\n![Leemage file detail](/public/projects/leemage/file-detail-image.png)\n\n![Leemage monitoring dashboard](/public/projects/leemage/monitoring-30d.png)\n\n## Project Overview\n\nGitHub : [https://github.com/leey00nsu/leemage](https://github.com/leey00nsu/leemage)\nDemo : [https://leemage.leey00nsu.com/](https://leemage.leey00nsu.com/)\n\nWhen adding file upload features to side projects, cost became an issue.\nSince **OCI Object Storage / Cloudflare R2** offer free tiers with a certain amount of storage, I built a **self-hosted file management platform for cost savings** instead of using paid services like Cloudinary.\nFiles can be organized by project and quickly integrated into other projects through external APIs and SDKs.\n\n## Key Features\n\n- Project-based file upload/management: Supports all file extensions including images, videos, and documents\n- Image transformation options: Resize/format conversion\n- External API/SDK: RESTful API and TypeScript SDK\n- OpenAPI documentation automation: Auto-generate OpenAPI spec from Zod schemas\n- Multi-storage support: Choose between OCI Object Storage / Cloudflare R2\n- i18n support: Korean/English\n\n## Problem\n\n- **Server load on large file uploads**: Memory/network load spikes when files go through the server\n- **Multi-storage API differences**: OCI Object Storage and Cloudflare R2 have different API interfaces, requiring full code modification when switching providers\n- **Image size optimization**: Heavy image resizing/format conversion needed\n- **API documentation mismatch**: When managing API docs separately, inconsistencies between code and documentation can occur\n\n## Solution\n\n- **Presigned URL direct upload**: Clients upload directly to storage, eliminating server load\n- **Storage Adapter pattern**: Write provider-independent code with common interfaces, implement only adapters for new providers (OCP compliant)\n- **Sharp-based image transformation**: Parallel processing to generate multiple variants simultaneously, supporting lightweight next-gen formats like WebP/AVIF\n- **TypeScript SDK**: Abstract complex 3-step upload flow (presign → upload → confirm) into a single method\n- **OpenAPI auto-generation**: Auto-generate OpenAPI spec from Zod schemas for API documentation and type synchronization\n\n## Impact\n\n- **Server load**: 0% server load for file transfers with Presigned URL\n- **Image size optimization**: 50-60% reduction compared to original with WebP/AVIF conversion\n- **Cost savings**: Utilizing OCI, Cloudflare R2 Free Tier\n- **Integration ease**: Quick integration into external projects with TypeScript SDK\n",
      "width": 1024,
      "height": 1024
    },
    "leesfield": {
      "slug": "leesfield",
      "title": "Leesfield",
      "summary": "AI image/video generation platform",
      "keyFeatures": [
        "Adapter-pattern-based image/video generation (currently includes Hugging Face Space adapter)",
        "Monitoring dashboard",
        "External API"
      ],
      "links": {
        "github": "https://github.com/leey00nsu/leesfield",
        "demo": "https://leesfield.leey00nsu.com/"
      },
      "period": {
        "start": "2026-01",
        "end": "2026-02"
      },
      "techStacks": [
        "Next.js",
        "TypeScript",
        "PostgreSQL",
        "Tailwind CSS",
        "shadcn/ui",
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
      "deployment": {
        "status": "active",
        "kind": "service",
        "category": "aiService",
        "url": "https://leesfield.leey00nsu.com/",
        "order": 3,
        "coverImage": "/public/projects/leesfield/landing.png"
      },
      "content": "\n![leesfield landing page](/public/projects/leesfield/landing.png)\n\n![leesfield image generation page](/public/projects/leesfield/image-generation.png)\n\n## Project Overview\n\nGitHub : [https://github.com/leey00nsu/leesfield](https://github.com/leey00nsu/leesfield)\nDemo : [https://leesfield.leey00nsu.com/](https://leesfield.leey00nsu.com/)\n\nWhen adding AI image/video generation to side projects, I wanted to build my **own pipeline**.\nMost image/video generation APIs are paid, but **Hugging Face Zero GPU** offers limited free usage, allowing me to start without cost concerns.\n\nCurrently only the Hugging Face adapter is implemented, but the **adapter pattern design** allows easy integration with other AI APIs (OpenAI, Replicate, etc.) in the future.\nIt provides various AI models (FLUX, etc.) through a unified UI/API and automatically saves generated results to storage via Leemage integration.\n\n## Key Features\n\n- AI image/video generation: Adapter-based extensible architecture (currently provides free Hugging Face Space adapter)\n- Model catalog management: DB-based model registration/editing, dynamic UI rendering\n- Monitoring dashboard: Generation request status and monitoring\n- Generation history management: All generation requests saved to DB\n- External API: OpenAPI auto-generation based on Zod schemas\n- Leemage integration: Automatic upload of generated results\n- i18n support: Korean/English\n\n## Problem\n\n- **AI model diversity**: Different API interfaces, parameters, and timeouts for each model\n- **Storage integration**: External storage integration needed for permanent result storage\n- **Model configuration management**: Need to manage model-specific parameters, UI types, and defaults without code modification\n- **API documentation mismatch**: When managing API docs separately, inconsistencies between code and documentation can occur\n- **Difficulty tracking generation requests**: Hard to monitor success/failure rates and processing delays in real-time\n\n## Solution\n\n- **API call adapter pattern**: Separate adapters per model provider (hf_space, etc.), implement only adapters for new providers\n- **Storage adapter pattern**: Separate external storage integration (Leemage, etc.) into adapters\n- **DB-based model catalog**: Register model settings/parameters via admin UI, add new models without code changes\n- **OpenAPI auto-generation**: Auto-generate OpenAPI spec from Zod schemas for API documentation and type synchronization\n- **Integrated monitoring dashboard**: Real-time view of request status (active/pending/processing), error rates, and avg/P95 latency. Model/API key statistics and daily trend charts\n\n## Impact\n\n- **Cost savings**: Utilizing Hugging Face Space free GPU\n- **Model scalability**: Add new models without code modification via DB model catalog\n- **Storage integration**: Permanent generation history preservation via Leemage integration\n- **Operational visibility**: Real-time monitoring for immediate request status and error rate tracking\n- **Multilingual support**: Korean/English i18n\n",
      "width": 512,
      "height": 512
    },
    "stock-aquarium": {
      "slug": "stock-aquarium",
      "title": "Stock Aquarium",
      "summary": "A data visualization service that turns real-time stock trades into fish swimming through a 3D aquarium",
      "keyFeatures": [
        "Trade direction and volume represented through fish color and scale",
        "KIS WebSocket data fanned out from one server connection over SSE",
        "Stable high-frequency 3D rendering through object pooling"
      ],
      "links": {
        "github": "https://github.com/leey00nsu/stock-aquarium",
        "demo": "https://aquarium.leey00nsu.com/"
      },
      "period": {
        "start": "2026-07",
        "end": "2026-07"
      },
      "techStacks": [
        "Next.js",
        "TypeScript",
        "Three.js",
        "React Three Fiber",
        "Server-Sent Events"
      ],
      "thumbnail": "/public/projects/stock-aquarium/stock-aquarium-icon.png",
      "draft": true,
      "type": "solo",
      "deployment": {
        "status": "active",
        "kind": "service",
        "category": "dataVisualization",
        "url": "https://aquarium.leey00nsu.com/",
        "order": 2,
        "coverImage": "/public/projects/stock-aquarium/stock-aquarium-screen.png"
      },
      "content": "\n![Stock Aquarium live aquarium screen](/public/projects/stock-aquarium/stock-aquarium-screen.png)\n\n## Project Overview\n\nGitHub: [https://github.com/leey00nsu/stock-aquarium](https://github.com/leey00nsu/stock-aquarium)<br />\nDemo: [https://aquarium.leey00nsu.com/](https://aquarium.leey00nsu.com/)\n\nA **data visualization service that transforms real-time Korea Investment & Securities trades into fish moving through a 3D aquarium**. Buy trades become red fish swimming right, sell trades become blue fish swimming left, and trade volume controls their scale.\n\nInstead of another price screen made of numbers and charts, the aquarium communicates direction, trade strength, volume, and volatility through one underwater environment. Fish and particles accelerate as volume rises, while volatility can trigger a storm and camera shake.\n\n## Key Features\n\n- Trade direction and scale visualized through fish movement, color, and size\n- Volume spikes, volatility, and trading halts represented as environmental changes\n- Search and real-time quotes for 40 major Korean and U.S. stocks\n- One KIS WebSocket connection fanned out to multiple browsers over SSE\n- Trade aggregation every 100ms and controlled fish creation every 250ms\n- A fixed pool of 80 fish updated through one frame loop\n- Two-level stock-master caching across server memory and disk\n- Mock market data with switches for live and virtual KIS environments\n\n## Problem\n\n- **High-frequency trades**: Opening a WebSocket per browser or creating a new 3D object for every trade would increase both server and rendering load.\n- **Different liquidity by stock**: Absolute volume makes it difficult to compare fish sizes consistently between highly liquid and less active stocks.\n- **Shared real-time connections**: More viewers of the same stock should not multiply KIS subscriptions and JSON serialization work.\n- **3D object lifecycle cost**: Repeatedly creating and removing fish models, skeleton animations, and movement state can cause frame drops and memory pressure.\n- **Operational security and recovery**: KIS credentials must remain server-side while the service handles connection limits, reconnects, and stock-data failures.\n\n## Solution\n\n- **Server-only KIS gateway**: Keep the KIS App Key and Secret on the server, then redistribute trades from one WebSocket connection through a Next.js Route Handler using SSE.\n- **Per-stock fan-out**: Aggregate and serialize trades once per stock, allowing every browser subscribed to that stock to reuse the same SSE bytes.\n- **Relative trade-size calculation**: Map each trade against the percentile distribution of the stock's latest 40 trades, keeping fish between 0.6 and 2.5 times their base scale.\n- **Fixed object pool**: Prepare and reuse 80 fish. When creation capacity is full, combine queued volume and trade counts by direction instead of discarding the data.\n- **Connection protection and recovery**: Apply global and per-IP limits, reconnect to KIS with exponential backoff, and restore only stocks that are still in use.\n- **Two-level cache and fallback**: Keep the stock master in server memory for 24 hours and on disk, with a built-in representative U.S. stock list when ranking requests fail.\n\n## Impact\n\n- **Intuitive real-time data**: Direction, trade size, and market conditions can be understood through aquarium movement without reading every number.\n- **Lower subscription cost**: Even when 100 people watch the same stock, the server keeps only one corresponding KIS real-time subscription.\n- **Stable rendering ceiling**: Reusing at most 80 fish prevents 3D object counts from growing without bound during trade spikes.\n- **Reduced data loss**: Trades beyond the visual creation rate are combined by direction so fewer events are rendered without losing their volume signal.\n- **Production-ready streaming foundation**: Reconnects, keep-alives, request limits, security headers, and cache fallbacks support long-lived real-time sessions.\n",
      "width": 512,
      "height": 512
    },
    "syu-character-maker": {
      "slug": "syu-character-maker",
      "title": "Create Your Own Suya and Suho",
      "summary": "A web app to customize and share Sahmyook University mascots",
      "keyFeatures": [],
      "links": {
        "github": "https://github.com/leey00nsu/syu-character-maker"
      },
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
      "draft": true,
      "type": "solo",
      "deployment": {
        "status": "maintained",
        "kind": "service",
        "category": "interactiveWeb",
        "url": "https://character-maker.leey00nsu.com/",
        "order": 6,
        "coverImage": "/public/projects/syu-character-maker/syu-character-maker.webp"
      },
      "content": "\n## Project Introduction\n\nGitHub : [https://github.com/leey00nsu/syu-character-maker](https://github.com/leey00nsu/syu-character-maker)\n\nThis is a web application that lets you customize Sahmyook University mascots, Suya and Suho.  \nStudents can freely decorate the characters and save the results as images or share them with classmates.\n\n## Key Features\n\n- React-konva canvas-based decorating tools (pen, stickers, etc.)\n- Download the result as an image and upload/share\n- State management and optimization using Zustand + TanStack Query\n",
      "width": 2578,
      "height": 1810
    }
  }
} as const satisfies GeneratedProjectsMap
