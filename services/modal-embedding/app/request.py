from typing import Any


class InvalidEmbeddingRequestError(ValueError):
    pass


def normalize_embedding_input(payload: dict[str, Any]) -> list[str]:
    embedding_input = payload.get("input")

    if isinstance(embedding_input, str):
        return [embedding_input]

    if isinstance(embedding_input, list) and all(
        isinstance(item, str) for item in embedding_input
    ):
        return embedding_input

    raise InvalidEmbeddingRequestError(
        "The input field must be a string or a list of strings.",
    )
