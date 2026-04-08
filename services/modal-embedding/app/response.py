def build_embedding_response(
    embeddings: list[list[float]],
    model_id: str,
) -> dict[str, object]:
    data = []

    for index, embedding in enumerate(embeddings):
        data.append(
            {
                "object": "embedding",
                "index": index,
                "embedding": embedding,
            }
        )

    return {
        "object": "list",
        "data": data,
        "model": model_id,
    }
