# ESP32 irrigation starter

`esp32/AgroSmartESP32/AgroSmartESP32.ino` is a configurable starter for an
ESP32 DevKit. It
pairs through a one-time code from the authenticated AgroSmart web app, stores
the per-device credential in ESP32 NVS, polls the Render command endpoint, and
sends sensor telemetry every minute and immediately after motor,
moisture-band, or manual-timer changes.
The backend updates the device's live reading on each report and stores a
five-sample average in device history after five periodic reports. Event
reports update the live reading but are excluded from the average.

## Required configuration and libraries

1. Install the ESP32 Arduino core and these Arduino libraries: ArduinoJson,
   DHT sensor library, and WiFiManager.
2. Set `API_BASE_URL` to the HTTPS URL of the deployed Render backend.
3. The sketch includes the Google Trust Services Root R4 CA used by the current
   Render endpoint and synchronizes its clock over NTP before making HTTPS
   requests. If the endpoint's certificate issuer changes, update the trusted
   CA; do not replace certificate validation with `setInsecure()`.
4. Verify every pin, relay polarity, ADC calibration, and LDR output polarity
   against the actual modules. The LDR uses its digital DO output on GPIO 5;
   this is a boot-strapping pin on classic ESP32 boards, so ensure the module
   does not hold it LOW during reset. The NPK UART, slave address, and register
   range are configured to match the supplied tested sensor sketch.
5. Upload the sketch with the relay disconnected from the pump for initial
   testing. Confirm the relay remains OFF at boot and test with a safe load
   before connecting irrigation equipment.

The starter assumes an ESP32 DevKit, DHT11, analog capacitive moisture sensor,
LDR module with digital DO output, RS-485 Modbus NPK probe, and relay module.
These defaults are not validated for a specific board or sensor. Confirm
wiring and relay polarity before connecting a pump. Current pin assignments
are:

| Function | ESP32 pin |
| --- | ---: |
| Moisture analog input | GPIO 34 |
| LDR input | GPIO 5 |
| DHT11 data | GPIO 4 |
| Motor relay (active-low) | GPIO 27 |
| Wi-Fi indicator assignment (not used by this sketch) | GPIO 2 |
| RS-485 UART2 RX / TX | GPIO 16 / GPIO 17 |
| RS-485 driver enable and receiver enable (tied together) | GPIO 18 |

The NPK probe is queried at 9600 baud, 8-N-1, Modbus slave `0x2A`, function
`0x03`, starting register `0x0003`, for three registers (N, P, K). Requests and
responses use Modbus CRC-16; replies are checked for address, function, byte
count, and CRC before values are sent as mg/kg. A failed or invalid response
omits N/P/K from that telemetry reading. The supplied pin configuration assigns
GPIO 4 to the DHT11, so RS-485 direction control uses GPIO 18 to avoid a pin
conflict. Verify GPIO 18 is available on the specific board and RS-485 module
wiring.

## Pair and operate

1. In AgroSmart, sign in, open Devices, optionally choose a farm field, and
   generate a pairing code.
2. Power the unpaired ESP32. Join the `AgroSmart-ESP32-Setup` Wi-Fi access
   point, enter the pairing code, and save the form. The setup portal exits
   after saving; the firmware checks backend HTTPS after Wi-Fi and clock sync,
   then attempts secure pairing. The code expires after 10 minutes.
3. Confirm the web page lists the device and receives its first telemetry.
4. Enable browser notifications from Irrigation. HTTPS and a configured Firebase
   Web Push/VAPID key are required.

Automatic mode starts below 30% moisture and stops at or above 60%. Manual runs
default to one hour in the web UI and can be set from one minute through 24
hours by the API. The ESP32 turns the relay OFF at expiry before posting the
timer-expired event. If Wi-Fi or the backend is unavailable, the hardware timer
still expires locally; the notification is sent when connectivity returns.

The web app stores readings under the paired farmer's selected field. Sensor
values and thresholds are starter assumptions; calibrate them before relying on
the system to control a real pump.
