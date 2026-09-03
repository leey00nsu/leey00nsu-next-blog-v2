from typing import Any


class InvalidEmbeddingRequestError(ValueError):
    pass


class InvalidEmbeddingModelError(ValueError):
    pass


def validate_embedding_model(
    requested_model_id: str | None,
    available_model_id: str,
) -> str:
    if requested_model_id is None or requested_model_id == available_model_id:
        return available_model_id

    raise InvalidEmbeddingModelError(
        f"Requested model '{requested_model_id}' is unavailable. "
        f"Use '{available_model_id}'.",
    )


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
