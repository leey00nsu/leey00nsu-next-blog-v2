import time


def build_embedding_response(
    embeddings: list[list[float]],
    model_id: str,
) -> dict[str, object]:
    created_timestamp = int(time.time())

    return {
        "object": "list",
        "data": [
            {
                "object": "embedding",
                "index": index,
                "embedding": embedding,
            }
            for index, embedding in enumerate(embeddings)
        ],
        "model": model_id,
        "created": created_timestamp,
        "usage": {
            "prompt_tokens": 0,
            "total_tokens": 0,
        },
    }
