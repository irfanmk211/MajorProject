import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from telemetry_triggers import get_telemetry_alerts


class TelemetryTriggerTests(unittest.TestCase):
    def test_alerts_when_moisture_enters_a_threshold_band(self):
        alerts = get_telemetry_alerts("normal", "off", "low", "off", None)
        self.assertEqual([alert["type"] for alert in alerts], ["moisture_low"])

    def test_does_not_repeat_alert_while_moisture_stays_in_band(self):
        alerts = get_telemetry_alerts("low", "off", "low", "off", None)
        self.assertEqual(alerts, [])

    def test_alerts_for_pump_state_changes(self):
        started = get_telemetry_alerts("normal", "off", "normal", "on", None)
        stopped = get_telemetry_alerts("normal", "on", "normal", "off", None)
        self.assertEqual([alert["type"] for alert in started], ["pump_started"])
        self.assertEqual([alert["type"] for alert in stopped], ["pump_stopped"])

    def test_timer_expiry_has_specific_alert_without_duplicate_stop_alert(self):
        alerts = get_telemetry_alerts("normal", "on", "normal", "off", "manual_timer_expired")
        self.assertEqual([alert["type"] for alert in alerts], ["manual_timer_expired"])


if __name__ == "__main__":
    unittest.main()
