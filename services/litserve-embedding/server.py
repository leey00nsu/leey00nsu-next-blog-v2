from typing import Any

import litserve as ls
from litserve.specs import OpenAIEmbeddingSpec

from app.config import (
    get_embedding_model_id,
    get_embedding_max_batch_size,
    get_embedding_port,
)


class TextEmbeddingAPI(ls.LitAPI):
    def setup(self, device: str) -> None:
        from sentence_transformers import SentenceTransformer

        self.model_id = get_embedding_model_id()
        resolved_device = None if device in ("auto", "") else device
        self.embedding_model = SentenceTransformer(
            self.model_id,
            device=resolved_device,
        )

    def predict(self, inputs: str | list[str]) -> list[list[float]] | list[float]:
        embeddings = self.embedding_model.encode(
            inputs,
            normalize_embeddings=True,
        )
        return embeddings.tolist()


def create_text_embedding_server() -> ls.LitServer:
    text_embedding_api = TextEmbeddingAPI(
        max_batch_size=get_embedding_max_batch_size(),
        spec=OpenAIEmbeddingSpec(),
    )

    return ls.LitServer(
        text_embedding_api,
        accelerator="auto",
    )


if __name__ == "__main__":
    server = create_text_embedding_server()
    server.run(port=get_embedding_port())
