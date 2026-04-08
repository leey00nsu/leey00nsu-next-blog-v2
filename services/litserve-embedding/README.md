# LitServe Embedding Server

Lightning AI / LitServe로 한국어·영어 블로그 문서와 질문을 같은 임베딩 모델로 처리하기 위한 최소 서버입니다.

## 선택한 모델

- 기본값: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
- 이유:
  - 한국어/영어 다국어 지원
  - `bge-m3`보다 가볍고 테스트 배포에 적합
  - 문서/질문 임베딩을 같은 모델로 맞추기 쉬움

운영 중 품질이 부족하면 `LITSERVE_EMBEDDING_MODEL_ID`만 바꿔서 더 큰 다국어 모델로 교체할 수 있습니다.

## 로컬 실행

```bash
cd services/litserve-embedding
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python server.py
```

기본 포트는 `8000`입니다.

## 로컬 요청 예시

```bash
curl -X POST http://127.0.0.1:8000/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "input": ["이 사람 이름 뭐야?", "what is his name"],
    "model": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
  }'
```

응답은 OpenAI embeddings API 호환 형태입니다.

## Lightning Cloud 배포

1. Lightning CLI 설치

```bash
pip install lightning
```

2. 로그인

```bash
lightning login
```

3. 배포

```bash
cd services/litserve-embedding
lightning deploy server.py --cloud
```

배포 후 발급된 URL에 `/v1/embeddings`로 요청하면 됩니다.

## 환경 변수

- `LITSERVE_EMBEDDING_MODEL_ID`
  - 기본값: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
- `LITSERVE_EMBEDDING_PORT`
  - 기본값: `8000`
- `LITSERVE_EMBEDDING_MAX_BATCH_SIZE`
  - 기본값: `1`
  - OpenAI embeddings API와 같은 배열 입력을 받을 때는 `1`을 유지하는 편이 안전합니다.

## 콜드부트 체크

scale-to-zero 환경이면 첫 요청이 느릴 수 있습니다. 최소한 아래 두 경우를 재보는 게 좋습니다.

1. 배포 직후 첫 요청 시간
2. 10~30분 idle 후 첫 요청 시간

예:

```bash
time curl -X POST https://<your-endpoint>/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "input": "what is his name",
    "model": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
  }'
```

질문 임베딩까지 이 서버에 맡길 계획이면, idle 후 첫 요청 시간이 허용 가능한지 반드시 확인해야 합니다.
