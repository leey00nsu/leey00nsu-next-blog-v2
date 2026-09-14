# Modal Embedding Server

Modal 위에 문서 임베딩과 질문 임베딩을 같은 모델로 처리하기 위한 최소 OpenAI-compatible 임베딩 서비스입니다.

## 구조

- endpoint: `/v1/embeddings`
- health check: `/health`
- 기본 모델: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
- 응답 형식: OpenAI embeddings API 호환

이 서비스는 현재 Next.js 앱의 Postgres Chat RAG가 요구하는 형태에 맞춰 설계되어 있습니다. 요청의 모델 ID가 서버에 로드된 모델과 다르면 잘못된 차원의 임베딩을 반환하지 않고 요청을 거부합니다.

## 로컬 개발

```bash
cd services/modal-embedding
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
modal serve server.py
```

`modal serve`는 임시 URL을 만들고, 코드 변경 시 자동 반영됩니다.

## 배포

```bash
cd services/modal-embedding
modal deploy server.py
```

배포 후 발급된 root URL을 앱의 `MODAL_EMBEDDING_BASE_URL`에 넣으면 됩니다.

앱은 내부에서 `/v1`를 붙이므로, root URL만 넣는 게 맞습니다.

예:

```env
BLOG_CHAT_RAG_EMBEDDING_PROVIDER=modal
BLOG_CHAT_RAG_EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
MODAL_EMBEDDING_BASE_URL=https://your-app-name--embedding-api.modal.run
```

## 인증

## 배포 대상 확인

블로그가 쓰는 앱은 `dbstndla1212` 워크스페이스에 있습니다. Modal CLI 프로필이 여러 개면 대상을 명시해야 합니다.

```bash
MODAL_PROFILE=dbstndla1212 modal deploy server.py
```

프로필을 지정하지 않으면 다른 워크스페이스의 동명 앱(`dbstndla1212yt--blog-embedding-api-...`)이 갱신되고, 실제 서비스는 예전 코드 그대로 남습니다. 배포 후에는 `/health`로 동작 중인 설정을 확인하세요.

```bash
curl -H "Modal-Key: $MODAL_EMBEDDING_KEY" -H "Modal-Secret: $MODAL_EMBEDDING_SECRET" \
  "$MODAL_EMBEDDING_BASE_URL/health"
# {"status":"ok","maximum_sequence_length":128}
```

`MODAL_EMBEDDING_MAXIMUM_SEQUENCE_LENGTH`를 바꾸면 앱의 `BLOG_CHAT_RAG_EMBEDDING_MAXIMUM_SEQUENCE_LENGTH`도 같이 바꿔야 합니다. 두 값이 다르면 색인 벡터와 질문 벡터의 기준이 어긋납니다.

이 서비스는 `@modal.asgi_app(requires_proxy_auth=True)`를 사용합니다.

즉 Modal에서 발급한 proxy auth token을 앱이 아래 헤더로 보내야 합니다.

- `Modal-Key`
- `Modal-Secret`

앱 쪽 env는 다음 두 값입니다.

예:

```env
MODAL_EMBEDDING_KEY=<your_modal_key>
MODAL_EMBEDDING_SECRET=<your_modal_secret>
```

## 성능

Modal web endpoint는 요청이 없을 때 scale to zero 될 수 있으므로 첫 요청 cold start가 날 수 있습니다.

이 서비스는 다음 완화를 기본 전제로 둡니다.

- CPU 기반 소형 다국어 모델 사용
- `enable_memory_snapshot=True`
- Hugging Face 캐시를 Modal Volume에 저장

그래도 질문 임베딩까지 실시간으로 이 endpoint를 쓰므로, 운영 전에는 idle 후 첫 요청 지연을 반드시 확인해야 합니다.

## 요청 예시

```bash
curl -X POST https://<your-modal-root-url>/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "input": ["이 사람 이름이 뭐야?", "what is his name"],
    "model": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
  }'
```
