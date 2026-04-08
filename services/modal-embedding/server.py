import modal
from fastapi import FastAPI
from pydantic import BaseModel

from app.config import (
    get_modal_embedding_application_name,
    get_modal_embedding_cache_path,
    get_modal_embedding_cpu_count,
    get_modal_embedding_model_id,
)
from app.request import normalize_embedding_input
from app.response import build_embedding_response

MODAL_APPLICATION_NAME = get_modal_embedding_application_name()
MODAL_CACHE_PATH = get_modal_embedding_cache_path()
MODAL_MODEL_ID = get_modal_embedding_model_id()
MODAL_CACHE_VOLUME = modal.Volume.from_name(
    "blog-modal-embedding-cache",
    create_if_missing=True,
)
MODAL_IMAGE = modal.Image.debian_slim(python_version="3.13").pip_install(
    "fastapi==0.116.1",
    "pydantic==2.11.7",
    "sentence-transformers==5.1.1",
).add_local_python_source("app")
MODAL_APPLICATION = modal.App(MODAL_APPLICATION_NAME)
app = MODAL_APPLICATION


class EmbeddingRequest(BaseModel):
    input: str | list[str]
    model: str | None = None


@MODAL_APPLICATION.cls(
    image=MODAL_IMAGE,
    cpu=get_modal_embedding_cpu_count(),
    enable_memory_snapshot=True,
    volumes={MODAL_CACHE_PATH: MODAL_CACHE_VOLUME},
)
class TextEmbeddingModel:
    @modal.enter(snap=True)
    def load_model(self) -> None:
        from sentence_transformers import SentenceTransformer

        self.model_id = MODAL_MODEL_ID
        self.model = SentenceTransformer(
            self.model_id,
            cache_folder=MODAL_CACHE_PATH,
        )

    @modal.method()
    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        embeddings = self.model.encode(
            texts,
            normalize_embeddings=True,
        )
        return embeddings.tolist()


def create_embedding_web_application() -> FastAPI:
    fastapi_application = FastAPI()
    text_embedding_model = TextEmbeddingModel()

    @fastapi_application.get("/health")
    async def get_health() -> dict[str, str]:
        return {"status": "ok"}

    @fastapi_application.post("/v1/embeddings")
    async def create_embeddings(
        request: EmbeddingRequest,
    ) -> dict[str, object]:
        normalized_inputs = normalize_embedding_input(request.model_dump())
        embeddings = text_embedding_model.embed_texts.remote(
            normalized_inputs,
        )

        return build_embedding_response(
            embeddings=embeddings,
            model_id=request.model or MODAL_MODEL_ID,
        )

    return fastapi_application


@MODAL_APPLICATION.function(image=MODAL_IMAGE)
@modal.asgi_app(requires_proxy_auth=True)
def embedding_api() -> FastAPI:
    return create_embedding_web_application()
