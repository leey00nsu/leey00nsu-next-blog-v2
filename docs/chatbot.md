# 블로그 Q&A: 구조와 운영

[English](./chatbot.en.md) · [README로 돌아가기](../README.md)

## 질문 처리

블로그 목록·상세 및 소개 페이지에서 `블로그 Q&A` 버튼을 누르면 질문할 수 있습니다. 질문 길이 기본 한도는 200자, 서비스 전체 일일 한도는 KST 기준 100회이며 환경변수로 조정할 수 있습니다.

1. TypeSafe Jev가 질문과 대화 상태를 보고 인사·챗봇 정체성·작성자 이름·연락처처럼 준비된 응답으로 충분한지 판단합니다. 그렇지 않으면 질문 대상, 범위, 시간 조건, 후속 대화 문맥 등을 포함한 검색 계획을 만듭니다. Jev의 `llm_planner`는 검색·답변 경로의 라벨이며 별도 LLM Question Planner 호출을 뜻하지 않습니다.
2. 근거가 필요한 질문은 빌드 시 생성한 블로그 lexical 검색 레코드, 소개·프로젝트·assistant 내부 문서로 만든 curated source, Postgres(`pgvector`) 의미 검색 후보를 조합합니다. `assistant` 근거는 내부 문서이므로 사용자용 citation 링크로 만들지 않습니다. Postgres 색인이 없거나 검색에 실패해도 일치하는 lexical·curated 근거가 있으면 그 경로로 답할 수 있습니다.
3. 최종 근거는 질문 토큰, 제목·섹션, 용어, 검색 범위 등을 반영해 선택합니다. 후보가 답변에 넣을 근거 수보다 많을 때만 LLM 리랭커를 호출합니다. 의미 검색 후보만 남으면 Jev로 질문과 근거의 직접 관련성을 추가 확인합니다.
4. 답변 모델은 제공된 근거만 사용하고, 근거 ID를 구조화된 출력으로 반환합니다. 서버가 선택된 근거와 citation을 검증하며, 근거가 부족하거나 검증이 실패하면 안전한 응답으로 대체합니다. 답변 모델에 외부 브라우징·검색 도구·파일 수정 권한을 주지 않습니다.

응답 비용을 줄이는 exact·semantic 캐시는 Postgres 연결 시 `chat_response_cache`에서 공유되고, 연결이 없으면 프로세스 메모리에 저장됩니다. 기본 TTL은 각각 5분·10분입니다. 캐시 키에는 콘텐츠 생성 단계에서 기록한 빌드 버전(Git 커밋 SHA, Git 정보가 없으면 빌드별 임의 ID)과 현재 활성 Postgres 색인 버전을 함께 넣습니다. 따라서 같은 커밋에서 색인을 다시 만들어도 이전 답변을 재사용하지 않습니다. DB가 설정됐지만 색인 버전을 조회할 수 없으면 캐시를 건너뛰고 일반 검색·답변 경로로 진행합니다. `GIT_COMMIT_SHA`를 Coolify에 수동 설정할 필요는 없습니다.

## 로컬 Postgres와 스키마

`docker compose`는 루트 `.env`를 읽습니다. 로컬 DB로 시험할 때는 `.env.example`을 참고해 `.env` 또는 `.env.local`의 연결 대상이 운영 DB가 아닌지 먼저 확인하세요. 색인 명령은 설정된 DB를 실제로 변경합니다.

```bash
docker compose -f docker-compose.postgres.yml up -d
pnpm run db:migrate
pnpm run verify:chat-rag
```

스키마는 `prisma/schema.prisma`와 `prisma/migrations`에서 관리합니다. `pnpm dev`, `pnpm start`, RAG 색인 생성 전에는 저장된 Prisma 마이그레이션이 적용됩니다. 배포 DB에는 `prisma migrate dev`나 `db push`를 실행하지 마세요. 기존 DB를 처음 연결하는 경우에는 백업·스키마 비교 후 기준 마이그레이션 등록 여부를 별도로 판단해야 합니다.

`verify:chat-rag`는 DB·임베딩 서비스·OpenAI 리랭커가 필요합니다. 품질 검사를 생략한 `gen:chat-rag-postgres`는 로컬 실험 외 배포 명령으로 사용하지 마세요.

## 콘텐츠 생성과 색인

- `predev`, `prebuild`, 테스트 전 단계의 `pnpm run gen:content`는 원본 MDX에서 이미지 메타데이터, 게시물·프로젝트 데이터, 챗봇 lexical 레코드와 빌드 버전을 생성합니다. 생성된 `*.generated.ts`는 Git에 올리지 않습니다. `.next` HTML을 크롤링하지 않습니다.
- 색인 작업은 lexical 레코드와 curated source를 청크로 나누고 임베딩을 생성해 Postgres에 후보 `index_version`으로 저장합니다. 제목 → 섹션 제목 → 본문 → 검색어 순으로 임베딩하므로 본문 앞부분을 우선합니다. 동일한 provider·모델·레시피·입력의 벡터는 이전 활성 색인에서 재사용합니다.
- 앱의 `BLOG_CHAT_RAG_EMBEDDING_MAXIMUM_SEQUENCE_LENGTH`와 Modal의 `MODAL_EMBEDDING_MAXIMUM_SEQUENCE_LENGTH`는 같은 값으로 맞춥니다. 기본값은 128입니다. 앱은 이 값을 색인 레시피 버전에 포함하지만 Modal 서비스 설정만 바뀌는 상황은 자동 검출하지 못합니다.
- `pnpm run gen:chat-rag-postgres --verify`는 후보 색인을 대상으로 실제 hybrid 검색 평가를 실행하고, 통과한 경우에만 활성 버전을 교체합니다. 실패하면 이전 활성 색인을 유지합니다. 일반 `gen:chat-rag-postgres`는 이 검사를 하지 않고, 필수 연결이 없으면 건너뛸 수도 있습니다.

## 검색 평가

`pnpm run test:run`에는 생성 코퍼스 기준 검색 회귀 검사가 포함됩니다. 기대 근거의 존재, 개별 케이스의 상위 3건 적중, 전체 recall@1 ≥ 0.8과 MRR ≥ 0.85를 검사합니다. 이는 lexical 기준선이며 운영 Postgres 색인까지 검증하지는 않습니다.

```bash
BLOG_CHAT_EVALUATE_LIVE_SEMANTIC=true pnpm run eval:chat-retrieval
pnpm run eval:chat-workflow
```

첫 명령은 활성 색인·임베딩 endpoint·리랭커를 포함한 검색을 평가합니다. 의미 검색 적중률 하한은 0.8이며, 호출 오류나 리랭크 실패도 검사합니다. `verify:chat-rag`는 같은 live 검색 평가를 활성화 전 후보 색인에 적용합니다. 두 번째 명령은 대표 질문 세 개로 질문 해석부터 답변·인용까지 확인하지만, 자동 통과가 모든 답변의 사실성을 보장하지는 않습니다. API 비용이 발생합니다.

의미 검색 후보 수(`BLOG_CHAT_RAG_MAXIMUM_SEMANTIC_CANDIDATES`, 기본 8)와 유사도 하한(`BLOG_CHAT_RAG_MINIMUM_SIMILARITY_SCORE`, 기본 0.15)을 조정할 때는 live 평가 전후를 비교하세요.

## Coolify 배포

현재 앱은 Nixpacks로 배포합니다. Coolify의 Build Command는 `pnpm install && pnpm exec playwright install --with-deps chromium && pnpm run build`입니다. 빌드는 `pnpm run gen:content`를 실행하지만 운영 Postgres 색인을 변경하지 않습니다. Coolify 앱의 **Post-deployment Command**는 `pnpm run verify:chat-rag`로 설정합니다. 이 값은 Coolify 설정에 저장되므로 저장소의 문서만 바꿔서는 반영되지 않습니다.

배포 후 새 컨테이너가 콘텐츠 생성 → 후보 색인 작성 → 후보의 live 검색 평가 → 활성화 순으로 실행합니다. 실패하면 이전 활성 색인은 유지되지만, Coolify는 Post-deployment Command 실패에도 배포를 성공으로 표시할 수 있습니다. 배포 로그의 `Indexed ... Active version` 메시지와 실제 활성 색인 갱신 여부를 확인하고, 실패·미갱신을 별도로 감지해야 합니다. 색인 보호는 이미 배포된 앱의 자동 롤백을 의미하지 않습니다.

최소한 다음 런타임 환경변수가 필요합니다.

- `BLOG_CHAT_RAG_DATABASE_URL` (또는 코드가 지원하는 `DATABASE_URL`)
- `MODAL_EMBEDDING_BASE_URL`; Modal 프록시 인증을 사용하는 경우 `MODAL_EMBEDDING_KEY`, `MODAL_EMBEDDING_SECRET`
- `OPENAI_API_KEY` 및 `OPENAI_BLOG_CHAT_RERANK_MODEL` 또는 `OPENAI_BLOG_CHAT_MODEL`

챗봇의 Jev 질문 분류에는 별도로 `TYPESAFE_API_KEY` 또는 `AI_GATEWAY_API_KEY`가 필요합니다. 없으면 질문에 안전한 거절 응답을 반환합니다. `TYPESAFE_DEFAULT_MODEL`은 선택 사항이며 기본값은 `jev-latest`입니다.

DB에는 `pgvector` 확장이 활성화돼 있어야 합니다. Post-deployment Command가 실행되는 새 이미지에 원본 콘텐츠와 스크립트가 있는지도 첫 배포 로그로 확인하세요.
