import os

MODAL_EMBEDDING_DEFAULTS = {
    "APPLICATION_NAME": "blog-embedding-api",
    "MODEL_ID": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    "CPU_COUNT": 2,
    "CACHE_PATH": "/models",
    "MAXIMUM_SEQUENCE_LENGTH": 256,
} | {}


def get_modal_embedding_application_name() -> str:
    return os.getenv(
        "MODAL_EMBEDDING_APPLICATION_NAME",
        MODAL_EMBEDDING_DEFAULTS["APPLICATION_NAME"],
    )


def get_modal_embedding_model_id() -> str:
    return os.getenv(
        "MODAL_EMBEDDING_MODEL_ID",
        MODAL_EMBEDDING_DEFAULTS["MODEL_ID"],
    )


def get_modal_embedding_cpu_count() -> int:
    return int(
        os.getenv(
            "MODAL_EMBEDDING_CPU_COUNT",
            str(MODAL_EMBEDDING_DEFAULTS["CPU_COUNT"]),
        )
    )


def get_modal_embedding_maximum_sequence_length() -> int:
    return int(
        os.getenv(
            "MODAL_EMBEDDING_MAXIMUM_SEQUENCE_LENGTH",
            str(MODAL_EMBEDDING_DEFAULTS["MAXIMUM_SEQUENCE_LENGTH"]),
        )
    )


def get_modal_embedding_cache_path() -> str:
    return os.getenv(
        "MODAL_EMBEDDING_CACHE_PATH",
        MODAL_EMBEDDING_DEFAULTS["CACHE_PATH"],
    )
