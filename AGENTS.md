# Agents Guide — FSD + React Conventions

코드 어시스턴트/에이전트가 일관된 코드 생성·리팩토링을 수행하도록 돕는 운영 규칙입니다.  
Next.js + TypeScript + React + FSD 구조를 전제로 합니다.  
답변은 한국어로 작성합니다.  
package.json을 참고하여 프로젝트의 의존성과 버전을 확인하여 답변을 작성합니다.

---

## 1. 핵심 원칙

- **Export**: named export만 허용. default export 금지.
- **Props 타입**: 기본은 `interface`. 유니온/판별식/유틸리티 조합이 핵심일 때 `type`.
- **폴더 구조(FSD)**: `app/`(라우팅) · `widgets/` · `features/` · `entities/` · `shared/`.
- **배럴 파일 금지**: `index.ts` 같은 re-export 불허.
- **불필요한 매직 금지**: 전역 상태/유틸 남발 금지. 도메인 가까이 배치.
- **축약어 금지**: 변수,함수,타입,인터페이스 이름을 축약하지 않고 용어 그대로 사용.
- **매직 넘버/리터럴 금지**: 숫자/문자 리터럴 사용 대신 의미 있는 이름 있는 상수로 분리한다.

---

## 2. Export/Import 규칙

- **파일당 1 컴포넌트**: PascalCase 컴포넌트, kebab-case 파일명.
- **명시적 Import 경로** 사용.
- **Codex 작업지시**: default export 발견 시 named로 변환, 배럴 파일 제거 후 import 수정.

---

## 3. Props 타입 규칙

- **interface** 기본: 확장/상속에 유리.
- **type**: 유니온/판별식, 템플릿 리터럴 등 타입 연산 중심일 때.
- **금칙**: `React.FC` 금지.
- **권장**: `children?: React.ReactNode` 명시.

---

## 4. FSD 디렉터리 역할

- **app/**: 라우팅·레이아웃·Server Components 조립. `_data`, `_actions` 임시 허용.
- **widgets/**: 여러 feature/entity 조합한 페이지 구역.
- **features/**: 사용자 행위 단위. UI + 비즈니스 규칙 + Server Action + useMutation.
- **entities/**: 도메인 개체. 타입/조회 API/읽기 useQuery.
- **shared/**: 순수 유틸·UI primitives·config. 도메인 지식 금지.

**참조 방향**: `shared → entities → features → widgets → app`. 반대 방향 금지.

---

## 5. 상태/데이터 접근

- **TanStack Query**
  - 읽기(useQuery) → entities
  - 쓰기(useMutation) → features
- **서버 액션**: features에 배치. 임시 라우트 전용은 `app/_actions`.
- **RSC(Server Components)**: app/에서 조립만. 로직은 entities/features로.
- **로컬 상태**: 컴포넌트 내부 또는 `useXxx` 훅. 전역 스토어는 최소화.

---

## 6. 스타일 & 접근성

- **UI**: shadcn/ui + Tailwind.
- **규칙**: aria-\* / role 적용, `<button>/<a>`만 클릭 요소. `div+onClick` 금지.
- **아이콘**: lucide-react 우선.

---

## 7. 테스트/스토리

- **Storybook**: 컴포넌트 옆 `*.stories.tsx`.
- **Vitest/RTL**: `*.test.tsx` 동일 디렉터리.
- **문서**: 필요시 README.mdx.

---

## 8. 함수 네이밍 규칙

- **핸들러(handleXxx)**: 컴포넌트 이벤트 (`handleSave`).
- **액션(commitXxx/doXxx/executeXxx)**: 서버 변이 (`commitPost`).
- **훅(useXxx)**: 상태/폼/뮤테이션 (`useSavePost`).
- **조회(getXxx/fetchXxx)**: 읽기 (`getPosts`).
- **검증(validateXxx/isXxx)**: 규칙 검사 (`validateFrontmatter`).
- **계산(calcXxx/selectXxx)**: 파생 데이터 (`calcPriceWithDiscount`).
- **변환(formatXxx/parseXxx/toXxx)**: 변환 (`formatDate`).
- **리매핑(remapXxx/rewriteXxx/collectXxx)**: 경로 변경·수집 (`remapImageSlug`).

---

## 9. model / lib / api 함수 구분 규칙

- **lib**: 순수 유틸, 사이드 이펙트 없음. 입력 → 출력.
  - 예: `formatDate`, `parseSlug`, `buildUniquePath`.
- **model**: 도메인 규칙·오케스트레이션. 단순 비즈니스 로직(remapXxx 등)부터 TanStack Query 훅(useQuery/useMutation), 폼 상태, 플러그인 콜백 팩토리까지 포함. 외부 상태/스토어/액션에 의존 가능.
  - 예: `entities/.../model/useGetPost`, `features/.../model/useCommitPost`, `features/.../model/validateFrontmatter`.
- **api**: 네트워크 호출 함수 (fetch/axios).
  - 예: `entities/.../api/getPost`, `features/.../api/commitPost`.

---

## 10. 매직 넘버/리터럴 금지

- 의미가 불명확한 숫자/문자 리터럴을 직접 사용하지 않음. 의미 있는 상수로 분리.
- 언어 관습, 자명한 값, 형식/문법 토큰, 일회성 값은 허용.
- 공용 상수: `shared/config/constants.ts`.
- 도메인 한정 상수: 해당 세그먼트 `.../config/constants.ts`.
- 상수는 UPPER_SNAKE_CASE , 네임스페이스 객체(as const)로 선언.
- 재사용 함수는 상수를 **인자로 주입**, 기본값은 config에서 import.
- 파일 내 동일한 성격의 상수는 객체로 정의하여 묶어서 관리.

---

## 11. 리팩토링 가이드 (Codex 자동 체크리스트)

1. **Export**: default export 제거 → named로 변환 후 import 수정.
2. **배럴 제거**: 직접 import로 교체.
3. **Props 타입**: interface 기본, 유니온은 type.
4. **React.FC 제거**: 함수 선언 + 명시적 children.
5. **API 호출 분리**: entity/.../api 또는 shared/api로 추출.
6. **레이어 위반 탐지**: 순환 참조/상향 의존 차단.
7. **접근성 점검**: 시맨틱 태그, aria, 포커스 확인.
8. **테스트/스토리**: 생성·보강 .
9. **함수 네이밍**: 규칙에 맞게 handle/commit/use/… 접두사 일관성 검사.
10. **model vs lib 분리**: 사이드 이펙트 있으면 model, 순수 계산이면 lib.
11. **api vs model 분리**: 네트워크 호출 함수 (fetch/axios).
12. **축약어 금지**: 의미를 명확히 전달할 수 있는 용어를 사용.
13. **매직 넘버/리터럴**: 의미 있는 상수로 분리.

---
