import base64
import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from agent import build_model, selected_model_provider
from receipt import parse_receipt


class ModelProviderTests(unittest.TestCase):
    def test_openai_provider_requires_a_key(self) -> None:
        with patch.dict(os.environ, {"NUTRIAHORRO_MODEL_PROVIDER": "openai"}, clear=False):
            os.environ.pop("OPENAI_API_KEY", None)
            self.assertEqual(selected_model_provider(), "openai")
            with self.assertRaisesRegex(ValueError, "OPENAI_API_KEY"):
                build_model()

    def test_openai_receipt_parser_returns_structured_items(self) -> None:
        encoded = base64.b64encode(b"small-image").decode("ascii")
        output = '{"merchant":"Ta-Ta","purchase_date":null,"items":[{"name":"Arroz","quantity":1,"unit":"kg","category":"Carbohidrato","best_before_days":120,"confidence":0.98}],"warnings":[]}'
        response = SimpleNamespace(output_text=output)
        client = SimpleNamespace(responses=SimpleNamespace(create=lambda **_kwargs: response))

        with patch.dict(os.environ, {
            "NUTRIAHORRO_MODEL_PROVIDER": "openai",
            "OPENAI_API_KEY": "test-only-key",
        }, clear=False), patch("openai.OpenAI", return_value=client):
            result = parse_receipt(encoded, "image/jpeg", "ticket.jpg")

        self.assertEqual(result["merchant"], "Ta-Ta")
        self.assertEqual(result["items"][0]["name"], "Arroz")


if __name__ == "__main__":
    unittest.main()
