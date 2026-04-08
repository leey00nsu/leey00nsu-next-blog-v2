from typing import Any


class InvalidEmbeddingRequestError(ValueError):
    pass


def normalize_embedding_input(request_payload: dict[str, Any]) -> list[str]:
    input_value = request_payload.get("input")

    if isinstance(input_value, str):
        normalized_text = input_value.strip()
        if not normalized_text:
            raise InvalidEmbeddingRequestError("input must not be empty")
        return [normalized_text]

    if isinstance(input_value, list):
        normalized_texts = [
            str(text_value).strip()
            for text_value in input_value
            if str(text_value).strip()
        ]
        if not normalized_texts:
            raise InvalidEmbeddingRequestError("input list must contain text")
        return normalized_texts

    raise InvalidEmbeddingRequestError("input must be a string or string list")
