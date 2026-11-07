"""Contract tests for the simulated cargo portfolio dataset."""
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.validate_data import validate


class AirportCargoTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.report = validate()

    def test_referential_integrity_and_temporal_order(self):
        self.assertEqual(self.report["error_count"], 0, self.report["errors"])

    def test_grain_and_coverage(self):
        self.assertEqual(self.report["table_rows"]["flights"], 120)
        self.assertEqual(self.report["table_rows"]["cargo"], 1111)
        self.assertEqual(self.report["table_rows"]["inconsistencies"], 394)

    def test_core_measures_are_not_double_counted(self):
        self.assertEqual(self.report["flight_on_time"], 54)
        self.assertEqual(self.report["flight_late"], 66)
        self.assertEqual(self.report["manifest_error_cargo"], 208)
        self.assertEqual(self.report["cargo_with_inconsistency"], 350)
        self.assertEqual(self.report["cargo_with_rework"], 223)
        self.assertEqual(self.report["storage_compliant_cargo"], 1021)
        self.assertEqual(self.report["received_pieces"], 44892)
        self.assertAlmostEqual(self.report["received_weight_kg"], 1384521.66, places=2)

    def test_frontend_assets_and_methodology(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        js = (ROOT / "assets" / "dashboard.js").read_text(encoding="utf-8")
        self.assertIn("BASE SIMULADA", html)
        self.assertIn('id="filter-airline"', html)
        self.assertIn("Promise.all(FILES.map", js)
        self.assertIn("flightIds", js)
        self.assertIn("function exportCargo", js)
        for name in ["flights", "cargo", "manifest", "operations", "inconsistencies", "release_process", "delivery"]:
            self.assertTrue((ROOT / "data" / "processed" / "csv" / (name + ".csv")).exists())


if __name__ == "__main__":
    unittest.main()
