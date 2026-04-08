import sys
import unittest
import inspect
from pathlib import Path

SERVICE_ROOT_PATH = Path(__file__).resolve().parents[1]

if str(SERVICE_ROOT_PATH) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT_PATH))

from app.request import InvalidEmbeddingRequestError, normalize_embedding_input
from app.response import build_embedding_response
from server import MODAL_IMAGE, app


class ModalEmbeddingRequestResponseTestCase(unittest.TestCase):
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

    def test_modal_application_is_exported_as_app(self) -> None:
        self.assertIsNotNone(app)

    def test_modal_image_declares_local_app_package_mount(self) -> None:
        server_module_source = inspect.getsource(sys.modules["server"])

        self.assertIn(
            '.add_local_python_source("app")',
            server_module_source,
        )


if __name__ == "__main__":
    unittest.main()
