import unittest
from pathlib import Path
import sys

SERVICE_ROOT_PATH = Path(__file__).resolve().parents[1]

if str(SERVICE_ROOT_PATH) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT_PATH))

from app.request import InvalidEmbeddingRequestError, normalize_embedding_input
from app.response import build_embedding_response
from server import create_text_embedding_server


class EmbeddingRequestResponseTestCase(unittest.TestCase):
    def test_normalize_embedding_input_accepts_string(self) -> None:
        self.assertEqual(
            normalize_embedding_input({"input": "what is his name"}),
            ["what is his name"],
        )

    def test_normalize_embedding_input_accepts_string_list(self) -> None:
        self.assertEqual(
            normalize_embedding_input({"input": ["react", "typescript"]}),
            ["react", "typescript"],
        )

    def test_normalize_embedding_input_rejects_invalid_input(self) -> None:
        with self.assertRaises(InvalidEmbeddingRequestError):
            normalize_embedding_input({"input": None})

    def test_build_embedding_response_matches_openai_like_shape(self) -> None:
        response = build_embedding_response(
            embeddings=[[0.1, 0.2], [0.3, 0.4]],
            model_id="test-model",
        )

        self.assertEqual(response["object"], "list")
        self.assertEqual(response["model"], "test-model")
        self.assertEqual(len(response["data"]), 2)
        self.assertEqual(response["data"][0]["index"], 0)
        self.assertEqual(response["data"][1]["embedding"], [0.3, 0.4])

    def test_create_text_embedding_server_uses_openai_embedding_spec(self) -> None:
        server = create_text_embedding_server()

        self.assertEqual(server.lit_api.api_path, "/v1/embeddings")
        self.assertEqual(
            type(server.lit_api._spec).__name__,
            "OpenAIEmbeddingSpec",
        )


if __name__ == "__main__":
    unittest.main()
