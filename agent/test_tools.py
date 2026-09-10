import base64
import json
import unittest
from copy import deepcopy

from receipt import _decode_image, _json_from_text, _media_format
from runtime_context import invocation_context, recorded_actions
from store import store
from tools import compare_nearby_shopping, get_daily_progress, inspect_pantry, register_cooked_meal, suggest_meals


class ToolTests(unittest.TestCase):
    def test_pantry_prioritizes_fresh_food(self) -> None:
        result = json.loads(inspect_pantry(max_days_left=3))
        names = {item["name"] for item in result["priority"]}
        self.assertEqual(names, {"Chicken breast", "Avocado", "Tomato"})

    def test_meal_filter_obeys_time(self) -> None:
        result = json.loads(suggest_meals(max_minutes=15))
        self.assertEqual([item["id"] for item in result], ["recipe-omelette"])

    def test_meal_filter_rejects_insufficient_stock(self) -> None:
        state = deepcopy(store.read())
        next(item for item in state["pantry"] if item["name"] == "Eggs")["quantity"] = 1
        with invocation_context(state=state):
            result = json.loads(suggest_meals(max_minutes=15))
        self.assertEqual(result, [])

    def test_walking_has_no_travel_cost(self) -> None:
        result = json.loads(compare_nearby_shopping(transport="walking"))
        self.assertEqual(result["best"]["supermarket"], "El Dorado")
        self.assertEqual(result["best"]["travel_cost"], 0)

    def test_car_includes_round_trip_cost(self) -> None:
        result = json.loads(compare_nearby_shopping(transport="car"))
        best = result["best"]
        self.assertEqual(best["travel_cost"], round(best["distance_km"] * 2 * 14))

    def test_daily_progress_reports_all_four_nutrients(self) -> None:
        result = json.loads(get_daily_progress())
        self.assertEqual(set(result["consumed"]), {"calories", "protein", "carbs", "fat"})
        self.assertEqual(result["remaining"]["protein"], 130)

    def test_remote_meal_registration_requires_matching_confirmation(self) -> None:
        state = store.read()
        with invocation_context(state=state):
            result = json.loads(register_cooked_meal(recipe_id="recipe-omelette", confirmed=True))
            actions = recorded_actions()
        self.assertTrue(result["confirmation_required"])
        self.assertEqual(actions[0]["status"], "confirmation_required")

        confirmation = {"type": "cook_recipe", "recipe_id": "recipe-omelette"}
        with invocation_context(state=state, confirmed_action=confirmation):
            result = json.loads(register_cooked_meal(recipe_id="recipe-omelette", confirmed=True))
            actions = recorded_actions()
        self.assertTrue(result["registered"])
        self.assertEqual(actions[0]["status"], "approved")

    def test_remote_meal_registration_rejects_wrong_confirmation(self) -> None:
        state = store.read()
        confirmation = {"type": "cook_recipe", "recipe_id": "recipe-rice-eggs"}
        with invocation_context(state=state, confirmed_action=confirmation):
            result = json.loads(register_cooked_meal(recipe_id="recipe-omelette", confirmed=True))
            actions = recorded_actions()
        self.assertTrue(result["confirmation_required"])
        self.assertEqual(actions[0]["recipe_id"], "recipe-omelette")

    def test_receipt_image_validation(self) -> None:
        encoded = base64.b64encode(b"small-image").decode("ascii")
        self.assertEqual(_decode_image(encoded), b"small-image")
        self.assertEqual(_media_format("image/jpeg", "ticket.bin"), "jpeg")
        with self.assertRaises(ValueError):
            _decode_image("not-base64")
        with self.assertRaises(ValueError):
            _media_format("application/pdf", "ticket.pdf")

    def test_receipt_json_requires_an_item_list(self) -> None:
        parsed = _json_from_text('Leading text {"merchant":"Ta-Ta","items":[]} trailing text')
        self.assertEqual(parsed["merchant"], "Ta-Ta")
        with self.assertRaises(ValueError):
            _json_from_text('{"merchant":"Ta-Ta"}')


if __name__ == "__main__":
    unittest.main()
