import os

LITSERVE_EMBEDDING = {
    "default_model_id": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    "default_port": 8000,
    "default_max_batch_size": 1,
    "default_maximum_sequence_length": 256,
}  # type: ignore[var-annotated]


def get_embedding_model_id() -> str:
    return os.getenv(
        "LITSERVE_EMBEDDING_MODEL_ID",
        LITSERVE_EMBEDDING["default_model_id"],
    )


def get_embedding_port() -> int:
    return int(
        os.getenv(
            "LITSERVE_EMBEDDING_PORT",
            str(LITSERVE_EMBEDDING["default_port"]),
        )
    )


def get_embedding_max_batch_size() -> int:
    return int(
        os.getenv(
            "LITSERVE_EMBEDDING_MAX_BATCH_SIZE",
            str(LITSERVE_EMBEDDING["default_max_batch_size"]),
        )
    )


def get_embedding_maximum_sequence_length() -> int:
    return int(
        os.getenv(
            "LITSERVE_EMBEDDING_MAXIMUM_SEQUENCE_LENGTH",
            str(LITSERVE_EMBEDDING["default_maximum_sequence_length"]),
        )
    )
