import json
import unittest

from tools import compare_nearby_shopping, inspect_pantry, suggest_meals


class ToolTests(unittest.TestCase):
    def test_pantry_prioritizes_fresh_food(self) -> None:
        result = json.loads(inspect_pantry(max_days_left=3))
        names = {item["name"] for item in result["priority"]}
        self.assertEqual(names, {"Pechuga de pollo", "Palta", "Tomate"})

    def test_meal_filter_obeys_time(self) -> None:
        result = json.loads(suggest_meals(max_minutes=15))
        self.assertEqual([item["id"] for item in result], ["recipe-omelette"])

    def test_walking_has_no_travel_cost(self) -> None:
        result = json.loads(compare_nearby_shopping(transport="walking"))
        self.assertEqual(result["best"]["supermarket"], "El Dorado")
        self.assertEqual(result["best"]["travel_cost"], 0)

    def test_car_includes_round_trip_cost(self) -> None:
        result = json.loads(compare_nearby_shopping(transport="car"))
        best = result["best"]
        self.assertEqual(best["travel_cost"], round(best["distance_km"] * 2 * 14))


if __name__ == "__main__":
    unittest.main()
