def get_telemetry_alerts(previous_band, previous_motor_state, band, motor_state, event):
    alerts = []

    if event == "manual_timer_expired":
        alerts.append({
            "title": "Manual watering timer ended",
            "body": "The motor was stopped. Open AgroSmart to continue for the previous duration or leave it stopped.",
            "type": "manual_timer_expired",
        })
    elif previous_motor_state in {"on", "off"} and previous_motor_state != motor_state:
        started = motor_state == "on"
        alerts.append({
            "title": "Pump started" if started else "Pump stopped",
            "body": "The irrigation pump started." if started else "The irrigation pump stopped.",
            "type": "pump_started" if started else "pump_stopped",
        })

    if band != previous_band and band in {"low", "high"}:
        if band == "low":
            body = "Soil moisture is below 30%. Start the motor manually or review automatic mode."
        elif motor_state == "on":
            body = "Soil moisture reached 60%. Automatic mode should stop the motor."
        else:
            body = "Soil moisture is above 60%. Consider stopping the motor."
        alerts.append({
            "title": "Soil moisture alert",
            "body": body,
            "type": f"moisture_{band}",
        })

    return alerts
