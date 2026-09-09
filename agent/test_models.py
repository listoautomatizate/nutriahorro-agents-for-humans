import base64
import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from agent import ask, build_model, selected_model_provider
from demo_model import DemoModel
from receipt import parse_receipt


class ModelProviderTests(unittest.TestCase):
    def test_demo_provider_runs_the_real_strands_tool_loop_without_external_calls(self) -> None:
        state = {
            "profile": {
                "name": "Lia",
                "city": "Maldonado",
                "age": 30,
                "heightCm": 177,
                "currentWeightKg": 66,
                "goalWeightKg": 60,
                "goalType": "perder grasa",
                "activityLevel": "moderada",
                "exerciseDaysPerWeek": 3,
                "exerciseMinutes": 60,
                "mealPrepMinutes": 20,
                "dietaryPreference": "omnivora",
                "allergies": [],
                "dislikes": [],
                "calorieMin": 1500,
                "calorieMax": 1600,
                "proteinGrams": 122,
                "carbsGrams": 114,
                "fatGrams": 50,
                "transportMode": "walking",
            },
            "pantry": [
                {"name": "Pollo", "quantity": 500, "unit": "g", "days_left": 2},
                {"name": "Arroz", "quantity": 1000, "unit": "g", "days_left": 90},
            ],
            "recipes": [{
                "id": "pollo-arroz",
                "name": "Pollo con arroz",
                "minutes": 20,
                "calories": 510,
                "protein": 45,
                "carbs": 52,
                "fat": 12,
                "uses": ["Pollo", "Arroz"],
            }],
            "shopping": [{
                "supermarket": "El Dorado",
                "distance_km": 0.9,
                "basket_price": 1086,
                "offers": [],
            }],
            "cooked": [],
        }

        with patch.dict(os.environ, {"NUTRIAHORRO_MODEL_PROVIDER": "demo"}, clear=False):
            self.assertIsInstance(build_model(), DemoModel)
            result = ask(
                "Que tengo que usar primero, que receta rapida puedo hacer y donde conviene comprar?",
                state=state,
            )

        self.assertEqual(result["mode"], "strands-demo")
        self.assertEqual(
            result["tools"],
            ["get_user_profile", "inspect_pantry", "suggest_meals", "compare_nearby_shopping", "register_cooked_meal"],
        )
        self.assertIn("Pollo", result["answer"])
        self.assertIn("45 g de proteina", result["answer"])
        self.assertIn("El Dorado", result["answer"])
        self.assertEqual(result["actions"][0]["status"], "confirmation_required")

        confirmation = {"type": "cook_recipe", "recipe_id": "pollo-arroz"}
        with patch.dict(os.environ, {"NUTRIAHORRO_MODEL_PROVIDER": "demo"}, clear=False):
            confirmed = ask(
                "Confirmo que cocine Pollo con arroz. Registrala ahora con recipe_id pollo-arroz y confirmed=true.",
                state=state,
                confirmed_action=confirmation,
            )

        self.assertEqual(confirmed["tools"], ["register_cooked_meal"])
        self.assertEqual(confirmed["actions"][0]["status"], "approved")
        self.assertIn("Registre Pollo con arroz", confirmed["answer"])

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
