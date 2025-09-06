Agents Guide — FSD + React Conventions (for Codex IDE)

본 문서는 Codex(코드 어시스턴트/에이전트)가 일관된 코드 생성·리팩토링을 수행하도록 돕는 운영 규칙입니다. Next.js + TypeScript + React + FSD 구조를 전제로 합니다. 배럴 파일 사용을 금지합니다.

Answer In Korean

⸻

0. 핵심 원칙 요약
   • Export 규칙: 기본은 named export (export function A() {} / export const fn = () => {}), default export는 금지.
   • Props 타입: 기본은 interface. 단, 유니온/판별식/유틸리티 타입 조합이 핵심인 경우 type 허용.
   • 폴더 구조(FSD): app/(라우팅) · widgets/ · features/ · entities/ · shared/.
   • 배럴 파일 금지: index.ts, barrel.ts 등으로 re-export하지 말 것. 명시적 경로 import 고수.
   • 불필요한 매직: 전역 상태/전역 유틸 남발 금지. 도메인 가까이 배치.

⸻

1. Export/Import 규칙

1.1 Named Export만 사용
• ✅ Do

// Button.tsx
export interface ButtonProps { label: string; onClick?: () => void }
export function Button({ label, onClick }: ButtonProps) { /_ ... _/ }

    •	❌ Don’t

const Button = () => { /_ ... _/ }
export default Button

1.2 파일당 1 컴포넌트 원칙(예외 최소화)
• UI 컴포넌트는 파일명 = 컴포넌트명(PascalCase). 예: Card.tsx, PostList.tsx.
• 동반 타입/훅/스타일은 같은 디렉터리에 _.types.ts, _.hooks.ts, \*.css 등으로 분리.

1.3 명시적 Import 경로
• ✅ import { Button } from "@/shared/ui/button/Button"
• ❌ import { Button } from "@/shared/ui" (배럴 금지)

Codex 작업지시: default export → named export 변환, 배럴 파일 발견 시 삭제 및 모든 import를 명시 경로로 일괄 수정.

⸻

2. Props 타입 설계 규칙

2.1 기본은 interface
• 확장/상속, HTML 속성 결합에 유리.

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
size?: 'sm' | 'md' | 'lg'
icon: React.ReactNode
}
export function IconButton({ icon, ...rest }: IconButtonProps) { /_ ... _/ }

2.2 type을 쓰는 경우
• 유니온/판별식 props(variant), 유틸리티 타입 조합, 템플릿 리터럴/매핑 타입 등 타입 연산이 핵심일 때.

type Solid = { variant: 'solid'; emphasis?: 'high' | 'low' }
type Ghost = { variant: 'ghost'; border?: boolean }

export type ButtonProps = (Solid | Ghost) & {
label: string
onClick?: () => void
}

2.3 금칙/권장
• ⛔ React.FC<Props> 사용 금지(children 암묵 포함, 제네릭 제약)
• ✅ children 필요 시 명시: children?: React.ReactNode
• ✅ 컴포넌트 경계 밖 비즈니스 로직/파생 상태 계산은 가급적 model/ 또는 훅으로 이동

Codex 작업지시: 유니온 중심이면 type, 그 외 객체 props는 interface로 자동 정규화. React.FC 발견 시 함수 선언 + 명시적 props로 변환.

⸻

3. FSD 디렉터리 역할

app/ // Next.js 라우팅/레이아웃/서버액션 진입점만
widgets/ // 페이지 구역 단위 컴포지션(여러 features/entities 조립)
features/ // 사용자 시나리오 단위(업로드, 좋아요, 코멘트 작성 등) + UI/모델/액션
entities/ // 핵심 도메인 개체(Post, User, Image 등) + UI/모델/리포지토리
shared/ // 크로스컷팅(설정, ui primitives, libs, api 클라이언트, hooks, config)

3.1 파일 배치 규칙(예)

entities/post/ui/PostCard.tsx
entities/post/model/post.types.ts
entities/post/api/post.repo.ts
features/like/ui/LikeButton.tsx
features/like/model/like.mutations.ts
widgets/post-list/ui/PostListSection.tsx
shared/ui/button/Button.tsx
shared/api/client.ts

Codex 작업지시: 새 코드 생성 시 계층을 features/entities/shared 중 가장 구체적인 레이어로 우선 배치. 상위 레이어에서 하위 레이어를 참조하되 반대는 금지(순환 참조 금지 검사).

⸻

4. 상태/데이터 접근 규칙
   • TanStack Query: 서버 상태만. 키/캐시/invalidates를 model/_.queries.ts/_.mutations.ts로 분리.
   • 로컬 상태: 컴포넌트 내부 혹은 useXxx 커스텀 훅. 전역 스토어는 신중히(명확한 공유 필요성 있을 때만).
   • 서버 액션/REST/gRPC: shared/api 또는 각 entity/.../api에 클라이언트 배치.

Codex 작업지시: 네트워크 호출 하드코딩 발견 시 API 레이어로 추출, 쿼리/뮤테이션 훅 생성 및 사용처 교체.

⸻

5. 스타일/접근성/UI 원칙
   • shadcn/ui + Tailwind 기준. 재사용 프리미티브는 shared/ui.
   • 컴포넌트는 접근성 속성(aria-\*, role)을 기본 채택.
   • 아이콘은 lucide-react 우선. 텍스트/색 대비 준수.

Codex 작업지시: 클릭 가능한 요소는 <button>/<a>를 사용. div+onClick 금지. 키보드 포커스 스타일 보장.

⸻

6. 파일 네이밍 & 코드 스타일
   • 파일명: PascalCase 컴포넌트, kebab-case 유틸/스타일(format-date.ts).
   • use client는 필요한 파일 최상단에만.
   • ESLint/Prettier 규칙 준수.

⸻

1. 테스트/스토리/문서
   • Storybook: 각 컴포넌트 옆에 _.stories.tsx(named export 스토리).
   • Vitest/RTL: _.test.tsx를 동일 디렉터리에 두고, 상호작용/접근성 테스트 작성.
   • MDX 문서(선택): README.mdx에 사용법/제약 기록.

Codex 작업지시: 신규 UI 생성 시 스토리/테스트 스캐폴딩 동시 생성.

⸻

8. 리팩토링 가이드 (Codex용 자동 수행 체크리스트)
   1. default export 제거 → named로 변경 후 모든 import 경로 업데이트.
   2. 배럴 파일 제거 → 하위 파일 직접 import로 교체.
   3. Props 타입 정규화 → 기본 interface, 유니온형은 type.
   4. React.FC 제거 → 함수 선언 + 명시적 children.
   5. API 호출 분리 → entity/.../api 또는 shared/api로 추출.
   6. 레이어 경계 위반 탐지 → 순환참조/상향 의존 끊기.
   7. 접근성 점검 → 인터랙션 요소/포커스/aria 보강.
   8. 테스트/스토리 보강 → 기본 렌더, 상태 전이, variant 케이스.

⸻

9. 코드 생성 템플릿 (프롬프트 스니펫)

[Goal]

- FSD 규칙, 배럴 금지, named export만 사용
- props는 interface(유니온이면 type)
- 접근성/테스트/스토리 포함 스캐폴딩

[Inputs]

- name: PostCard
- layer: entities/post
- props: { title: string; excerpt?: string; onClick?: () => void }

[Deliver]

- entities/post/ui/PostCard.tsx (export function PostCard)
- entities/post/ui/PostCard.stories.tsx
- entities/post/ui/PostCard.test.tsx
- entities/post/model/post.types.ts (필요 시)

⸻

10. 예시 스캐폴딩(요약)

// entities/post/ui/PostCard.tsx
'use client'
import \* as React from 'react'

export interface PostCardProps {
title: string
excerpt?: string
onClick?: () => void
children?: React.ReactNode
}

export function PostCard({ title, excerpt, onClick, children }: PostCardProps) {
return (

<article className="rounded-2xl border p-4 shadow-sm">
<h3 className="text-lg font-semibold">{title}</h3>
{excerpt && <p className="text-sm text-muted-foreground">{excerpt}</p>}
<div className="mt-2">{children}</div>
{onClick && (
<button className="mt-3 rounded-md border px-3 py-1" onClick={onClick}>
Open
</button>
)}
</article>
)
}

⸻

11. 품질 게이트(에이전트 최종 점검)
    • default export 없음
    • 배럴 import 없음(모두 명시 경로)
    • props: interface/type 규칙 준수
    • 순환 참조/레이어 위반 없음
    • 접근성 속성 OK, 상호작용 요소 시맨틱 태그 사용
    • 테스트/스토리 동시 추가 또는 업데이트
    • 린트/타입 에러 0

⸻

12. 부록: 자동 변환 힌트
    • 기계적 변환 예시(개념)
    • export default X → export { X } + 파일 내 export function X로 변경
    • import X from 'path' → import { X } from 'path/X'
    • const C: React.FC<P> → export interface P { ... } export function C(p: P) {}
    • 유니온 감지: | 포함, 판별 키(variant, type, kind 등) 존재 시 type 유지/채택

⸻

이 문서는 주기적으로 업데이트될 수 있습니다. 변경 시 PR에 규칙 변경 요약을 포함하세요.
