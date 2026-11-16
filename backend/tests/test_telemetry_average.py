import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from telemetry_average import accumulate_periodic_sample


class TelemetryAverageTests(unittest.TestCase):
    def test_completes_average_after_five_periodic_samples(self):
        window = {}
        start = datetime(2026, 11, 15, tzinfo=timezone.utc)

        for index in range(5):
            window, average = accumulate_periodic_sample(
                window,
                {"moisture": 10 + index, "temperature": 20 + index},
                start + timedelta(minutes=index),
            )

        self.assertEqual(average, {"temperature": 22.0, "moisture": 12.0})
        self.assertEqual(window["sampleCount"], 0)

    def test_averages_only_samples_present_for_each_sensor(self):
        window = {}
        start = datetime(2026, 11, 15, tzinfo=timezone.utc)
        samples = [
            {"moisture": 30, "n": 10},
            {"moisture": 40},
            {"moisture": 50, "n": 30},
            {"moisture": 60},
            {"moisture": 70},
        ]

        for index, sample in enumerate(samples):
            window, average = accumulate_periodic_sample(
                window, sample, start + timedelta(minutes=index)
            )

        self.assertEqual(average, {"n": 20.0, "moisture": 50.0})

    def test_drops_partial_window_after_device_gap(self):
        start = datetime(2026, 11, 15, tzinfo=timezone.utc)
        window, average = accumulate_periodic_sample(
            {}, {"moisture": 10}, start
        )
        self.assertIsNone(average)

        window, average = accumulate_periodic_sample(
            window, {"moisture": 90}, start + timedelta(minutes=3)
        )

        self.assertIsNone(average)
        self.assertEqual(window["sampleCount"], 1)
        self.assertEqual(window["sums"]["moisture"], 90)


if __name__ == "__main__":
    unittest.main()
