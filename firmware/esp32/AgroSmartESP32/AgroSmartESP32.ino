#include <ArduinoJson.h>
#include <DHT.h>
#include <HardwareSerial.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>
#include <time.h>

// Configure these for the exact board, sensor modules, and Render service.
static const char* API_BASE_URL = "https://agrosmart-of05.onrender.com";
static const char* API_HOST = "agrosmart-of05.onrender.com";
static const char* TLS_ROOT_CA_CERT = R"EOF(
-----BEGIN CERTIFICATE-----
MIICCTCCAY6gAwIBAgINAgPlwGjvYxqccpBQUjAKBggqhkjOPQQDAzBHMQswCQYD
VQQGEwJVUzEiMCAGA1UEChMZR29vZ2xlIFRydXN0IFNlcnZpY2VzIExMQzEUMBIG
A1UEAxMLR1RTIFJvb3QgUjQwHhcNMTYwNjIyMDAwMDAwWhcNMzYwNjIyMDAwMDAw
WjBHMQswCQYDVQQGEwJVUzEiMCAGA1UEChMZR29vZ2xlIFRydXN0IFNlcnZpY2Vz
IExMQzEUMBIGA1UEAxMLR1RTIFJvb3QgUjQwdjAQBgcqhkjOPQIBBgUrgQQAIgNi
AATzdHOnaItgrkO4NcWBMHtLSZ37wWHO5t5GvWvVYRg1rkDdc/eJkTBa6zzuhXyi
QHY7qca4R9gq55KRanPpsXI5nymfopjTX15YhmUPoYRlBtHci8nHc8iMai/lxKvR
HYqjQjBAMA4GA1UdDwEB/wQEAwIBhjAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQW
BBSATNbrdP9JNqPV2Py1PsVq8JQdjDAKBggqhkjOPQQDAwNpADBmAjEA6ED/g94D
9J+uHXqnLrmvT/aDHQ4thQEd0dlq7A/Cr8deVl5c1RxYIigL9zC2L7F8AjEA8GE8
p/SgguMh1YQdc4acLa/KNJvxn7kjNuK8YAOdgLOaVsjh4rsUecrNIdSUtUlD
-----END CERTIFICATE-----
)EOF";
static const char* DEVICE_AP_NAME = "AgroSmart-ESP32-Setup";

constexpr int MOISTURE_PIN = 34;
constexpr int LDR_PIN = 5;
constexpr int DHT_PIN = 4;
constexpr int MOTOR_RELAY_PIN = 27;
constexpr int WIFI_INDICATOR_PIN = 2;
constexpr int RS485_RX_PIN = 16;
constexpr int RS485_TX_PIN = 17;
constexpr int RS485_DE_RE_PIN = 18;
// Relay control polarity:
// Set to HIGH if your relay module turns ON with HIGH (Active-High, standard).
// Set to LOW if your relay module turns ON with LOW (Active-Low).
constexpr int RELAY_ON_LEVEL = HIGH;

constexpr int MOISTURE_DRY_ADC = 3500;
constexpr int MOISTURE_WET_ADC = 1500;
constexpr int LDR_DAY_IS_HIGH = 0;
constexpr uint8_t NPK_SLAVE_ID = 0x2A;
constexpr uint16_t NPK_START_REGISTER = 0x0003;
constexpr uint16_t NPK_REGISTER_COUNT = 3;
constexpr size_t NPK_RESPONSE_LENGTH = 11;

constexpr unsigned long COMMAND_POLL_MS = 5000;
constexpr unsigned long SENSOR_DIAGNOSTICS_INTERVAL_MS = 5000;
constexpr unsigned long TELEMETRY_INTERVAL_MS = 60000;
constexpr unsigned long PAIR_RETRY_INTERVAL_MS = 15000;
constexpr unsigned long WIFI_RECONNECT_INTERVAL_MS = 10000;
constexpr unsigned long API_PROBE_RETRY_INTERVAL_MS = 30000;
constexpr int WIFI_MAX_RECONNECT_ATTEMPTS = 6;

DHT dht(DHT_PIN, DHT11);
Preferences preferences;
WiFiManager wifiManager;
WiFiManagerParameter pairingCodeParameter(
    "pairingCode",
    "12-character AgroSmart pairing code",
    "",
    13
);
WiFiClientSecure tlsClient;

String deviceId;
String deviceToken;
String lastCommandId;
String pendingPairingCode;
String currentMode = "manual";
bool motorOn = false;
bool bootCommandSynchronized = false;
bool timerExpiredPending = false;
bool timeSyncConfigured = false;
bool networkTimeReady = false;
bool apiProbeSucceeded = false;
unsigned long manualStopAt = 0;
unsigned long lastCommandPollAt = 0;
unsigned long lastSensorDiagnosticsAt = 0;
unsigned long lastTelemetryAt = 0;
unsigned long lastTelemetryAttemptAt = 0;
unsigned long lastPairAttemptAt = 0;
unsigned long lastWifiReconnectAt = 0;
unsigned long lastApiProbeAt = 0;
int wifiReconnectAttempts = 0;
String lastMoistureBand;
bool lastReportedMotorOn = false;

void setMotor(bool on, bool force = false) {
  if (!force && motorOn == on) return;
  const int pinLevel = on ? RELAY_ON_LEVEL : (RELAY_ON_LEVEL == HIGH ? LOW : HIGH);
  digitalWrite(MOTOR_RELAY_PIN, pinLevel);
  motorOn = on;
  Serial.printf("Motor state: %s (GPIO %d = %s)\n", motorOn ? "ON" : "OFF", MOTOR_RELAY_PIN, pinLevel == HIGH ? "HIGH" : "LOW");
}

String getDeviceId() {
  char id[13];
  snprintf(id, sizeof(id), "%012llx", static_cast<unsigned long long>(ESP.getEfuseMac()));
  return String(id);
}

String createDeviceToken() {
  char token[65];
  for (int i = 0; i < 32; i++) {
    snprintf(token + i * 2, 3, "%02x", static_cast<unsigned int>(esp_random() & 0xFF));
  }
  token[64] = '\0';
  return String(token);
}

void configureTls() {
  tlsClient.setCACert(TLS_ROOT_CA_CERT);
  tlsClient.setTimeout(10000);
}

bool synchronizeClock() {
  if (!timeSyncConfigured) {
    configTime(0, 0, "pool.ntp.org", "time.google.com");
    timeSyncConfigured = true;
  }
  return time(nullptr) >= 1700000000;
}

bool postJson(const String& path, const JsonDocument& body, String* responseBody = nullptr) {
  if (WiFi.status() != WL_CONNECTED || strlen(TLS_ROOT_CA_CERT) == 0) {
    Serial.println("HTTPS unavailable: connect Wi-Fi and configure TLS_ROOT_CA_CERT.");
    return false;
  }

  IPAddress serverAddress;
  if (!WiFi.hostByName(API_HOST, serverAddress)) {
    Serial.printf("DNS lookup failed for %s.\n", API_HOST);
    return false;
  }
  Serial.printf("API DNS: %s -> %s\n", API_HOST, serverAddress.toString().c_str());

  HTTPClient http;
  const String url = String(API_BASE_URL) + path;
  if (!http.begin(tlsClient, url)) {
    Serial.println("Could not initialize HTTPS request.");
    return false;
  }
  http.setTimeout(10000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-AgroSmart-Device", deviceId);
  if (deviceToken.length()) http.addHeader("X-AgroSmart-Token", deviceToken);

  String requestBody;
  serializeJson(body, requestBody);
  const int status = http.POST(requestBody);
  const String response = status > 0 ? http.getString() : "";
  if (responseBody && status > 0) *responseBody = response;
  if (status < 200 || status >= 300) {
    if (status < 0) {
      Serial.printf("HTTPS transport error: %s (%d).\n", http.errorToString(status).c_str(), status);
      char tlsError[160] = {};
      const int tlsErrorCode = tlsClient.lastError(tlsError, sizeof(tlsError));
      Serial.printf("TLS client detail (%d): %s\n", tlsErrorCode, tlsError);
    } else {
      Serial.printf("HTTPS request returned HTTP %d.\n", status);
      if (response.length()) Serial.printf("Server response: %s\n", response.c_str());
    }
    http.end();
    return false;
  }
  http.end();
  return true;
}

void probeApiHealth() {
  if (apiProbeSucceeded || !networkTimeReady || WiFi.status() != WL_CONNECTED) return;
  const unsigned long now = millis();
  if (lastApiProbeAt && now - lastApiProbeAt < API_PROBE_RETRY_INTERVAL_MS) return;
  lastApiProbeAt = now;

  IPAddress serverAddress;
  if (!WiFi.hostByName(API_HOST, serverAddress)) {
    Serial.printf("API health check: DNS lookup failed for %s.\n", API_HOST);
    return;
  }
  Serial.printf("API DNS: %s -> %s\n", API_HOST, serverAddress.toString().c_str());

  HTTPClient http;
  if (!http.begin(tlsClient, String(API_BASE_URL) + "/")) {
    Serial.println("API health check: could not initialize HTTPS.");
    return;
  }
  http.setTimeout(15000);
  const int status = http.GET();
  if (status > 0) {
    const String response = http.getString();
    Serial.printf("API health check: HTTP %d.\n", status);
    if (response.length()) Serial.printf("API response: %s\n", response.c_str());
    apiProbeSucceeded = status == HTTP_CODE_OK;
  } else {
    Serial.printf("API health transport error: %s (%d).\n", http.errorToString(status).c_str(), status);
    char tlsError[160] = {};
    const int tlsErrorCode = tlsClient.lastError(tlsError, sizeof(tlsError));
    Serial.printf("TLS client detail (%d): %s\n", tlsErrorCode, tlsError);
  }
  http.end();
}

bool pairDevice(const String& pairingCode) {
  if (pairingCode.length() != 12) {
    Serial.println("Pairing requires a valid 12-character code from the AgroSmart web app.");
    return false;
  }

  const String newToken = createDeviceToken();
  StaticJsonDocument<256> body;
  body["pairingCode"] = pairingCode;
  body["deviceId"] = deviceId;
  body["deviceToken"] = newToken;

  String response;
  if (!postJson("/api/devices/pair", body, &response)) return false;
  StaticJsonDocument<256> result;
  if (deserializeJson(result, response) || result["success"] != true) {
    Serial.println("The backend did not confirm device pairing.");
    return false;
  }

  deviceToken = newToken;
  preferences.putString("deviceToken", deviceToken);
  lastCommandId = "";
  preferences.remove("lastCommandId");
  Serial.println("Device paired to the selected farmer field.");
  return true;
}

void attemptPairing() {
  if (!deviceToken.isEmpty() || pendingPairingCode.isEmpty() || !networkTimeReady ||
      WiFi.status() != WL_CONNECTED) return;

  const unsigned long now = millis();
  if (lastPairAttemptAt && now - lastPairAttemptAt < PAIR_RETRY_INTERVAL_MS) return;
  lastPairAttemptAt = now;
  pairDevice(pendingPairingCode);
}

int readMoisturePercent(int* rawValue = nullptr) {
  const int raw = analogRead(MOISTURE_PIN);
  if (rawValue) *rawValue = raw;
  const int percent = map(raw, MOISTURE_DRY_ADC, MOISTURE_WET_ADC, 0, 100);
  return constrain(percent, 0, 100);
}

String readLightState(int* rawValue = nullptr) {
  const int raw = digitalRead(LDR_PIN);
  if (rawValue) *rawValue = raw;
  const bool signalHigh = raw == HIGH;
  const bool day = LDR_DAY_IS_HIGH ? signalHigh : !signalHigh;
  return day ? "day" : "night";
}

uint16_t calculateCRC(const uint8_t* buffer, size_t length) {
  uint16_t crc = 0xFFFF;
  for (size_t position = 0; position < length; position++) {
    crc ^= buffer[position];
    for (uint8_t bit = 0; bit < 8; bit++) {
      crc = (crc & 1) ? (crc >> 1) ^ 0xA001 : crc >> 1;
    }
  }
  return crc;
}

bool readNpk(float& nitrogen, float& phosphorus, float& potassium) {
  uint8_t query[8] = {
    NPK_SLAVE_ID,
    0x03,
    static_cast<uint8_t>(NPK_START_REGISTER >> 8),
    static_cast<uint8_t>(NPK_START_REGISTER & 0xFF),
    static_cast<uint8_t>(NPK_REGISTER_COUNT >> 8),
    static_cast<uint8_t>(NPK_REGISTER_COUNT & 0xFF),
    0,
    0,
  };
  const uint16_t queryCrc = calculateCRC(query, 6);
  query[6] = static_cast<uint8_t>(queryCrc & 0xFF);
  query[7] = static_cast<uint8_t>(queryCrc >> 8);

  while (Serial2.available() > 0) {
    Serial2.read();
  }

  digitalWrite(RS485_DE_RE_PIN, HIGH);
  delay(2);
  Serial2.write(query, sizeof(query));
  Serial2.flush();
  digitalWrite(RS485_DE_RE_PIN, LOW);

  uint8_t response[NPK_RESPONSE_LENGTH];
  size_t received = 0;
  const unsigned long startedAt = millis();
  while (millis() - startedAt < 500 && received < sizeof(response)) {
    if (Serial2.available() > 0) {
      response[received++] = static_cast<uint8_t>(Serial2.read());
    } else {
      delay(1);
    }
  }

  if (received != NPK_RESPONSE_LENGTH) {
    Serial.printf("[NPK] Response timeout: received %u of %u bytes.\n",
        static_cast<unsigned>(received), static_cast<unsigned>(NPK_RESPONSE_LENGTH));
    return false;
  }
  if (response[0] != NPK_SLAVE_ID
      || response[1] != 0x03
      || response[2] != NPK_REGISTER_COUNT * 2) {
    Serial.printf("[NPK] Unexpected response header: %02X %02X %02X.\n",
        response[0], response[1], response[2]);
    return false;
  }

  const uint16_t responseCrc = static_cast<uint16_t>(response[9])
      | (static_cast<uint16_t>(response[10]) << 8);
  const uint16_t calculatedCrc = calculateCRC(response, 9);
  if (calculatedCrc != responseCrc) {
    Serial.printf("[NPK] CRC mismatch: received %04X, calculated %04X.\n",
        responseCrc, calculatedCrc);
    return false;
  }

  nitrogen = static_cast<uint16_t>(response[3] << 8) | response[4];
  phosphorus = static_cast<uint16_t>(response[5] << 8) | response[6];
  potassium = static_cast<uint16_t>(response[7] << 8) | response[8];
  return true;
}

void logSensorReadings() {
  const float temperature = dht.readTemperature();
  const float humidity = dht.readHumidity();
  int moistureRaw = 0;
  const int moisture = readMoisturePercent(&moistureRaw);
  int lightRaw = LOW;
  const String light = readLightState(&lightRaw);

  Serial.println("\n--- Sensor diagnostics ---");
  if (isfinite(temperature)) {
    Serial.printf("Temperature: %.1f C\n", temperature);
  } else {
    Serial.println("Temperature: INVALID (check DHT11 wiring)");
  }
  if (isfinite(humidity)) {
    Serial.printf("Humidity: %.1f %%\n", humidity);
  } else {
    Serial.println("Humidity: INVALID (check DHT11 wiring)");
  }
  Serial.printf("Soil moisture: %d%% (ADC raw: %d)\n", moisture, moistureRaw);
  Serial.printf("LDR: %s (GPIO %d: %s)\n",
      light.c_str(), LDR_PIN, lightRaw == HIGH ? "HIGH" : "LOW");

  float nitrogen, phosphorus, potassium;
  if (readNpk(nitrogen, phosphorus, potassium)) {
    Serial.printf("NPK: N %.0f, P %.0f, K %.0f mg/kg\n",
        nitrogen, phosphorus, potassium);
  } else {
    Serial.println("NPK: no valid reading");
  }
  Serial.println("--------------------------");
}

String moistureBand(int moisture) {
  if (moisture < 30) return "low";
  if (moisture >= 60) return "high";
  return "normal";
}

void sendTelemetry(const char* event = nullptr, bool periodic = false) {
  if (deviceToken.isEmpty()) return;
  const unsigned long now = millis();
  if (lastTelemetryAttemptAt && now - lastTelemetryAttemptAt < 5000) return;
  lastTelemetryAttemptAt = now;

  const float temperature = dht.readTemperature();
  const float humidity = dht.readHumidity();
  const int moisture = readMoisturePercent();

  StaticJsonDocument<512> body;
  if (isfinite(temperature)) body["temperature"] = temperature;
  if (isfinite(humidity)) body["humidity"] = humidity;
  body["moisture"] = moisture;
  body["ldr"] = readLightState();
  body["motor"] = motorOn ? "on" : "off";
  body["mode"] = currentMode;
  body["sampleType"] = periodic ? "periodic" : "event";
  if (event) body["event"] = event;

  float nitrogen, phosphorus, potassium;
  if (readNpk(nitrogen, phosphorus, potassium)) {
    body["n"] = nitrogen;
    body["p"] = phosphorus;
    body["k"] = potassium;
    Serial.printf("NPK (mg/kg): N %.0f, P %.0f, K %.0f\n", nitrogen, phosphorus, potassium);
  } else {
    Serial.println("NPK read failed; sending telemetry without N/P/K.");
  }

  if (postJson("/api/devices/telemetry", body)) {
    lastTelemetryAt = millis();
    lastMoistureBand = moistureBand(moisture);
    lastReportedMotorOn = motorOn;
    timerExpiredPending = false;
    Serial.println("Telemetry sent.");
  }
}

void applyCommand(const JsonDocument& command) {
  const String commandId = command["commandId"] | "";
  if (commandId.isEmpty()) return;

  if (!bootCommandSynchronized) {
    bootCommandSynchronized = true;
    lastCommandId = commandId;
    preferences.putString("lastCommandId", lastCommandId);
    currentMode = "manual";
    manualStopAt = 0;
    setMotor(false);
    Serial.println("Discarded the stored command at boot; starting in manual/off mode.");
    sendTelemetry();
    return;
  }

  if (commandId == lastCommandId) return;

  const String mode = command["mode"] | "manual";
  const String motor = command["motor"] | "off";
  if (mode != "manual" && mode != "automatic") {
    Serial.println("Ignoring command with an invalid mode.");
    return;
  }

  currentMode = mode;
  if (mode == "automatic" && motor == "auto") {
    manualStopAt = 0;
  } else if (motor == "on" && mode == "manual") {
    const uint16_t durationMinutes = command["durationMinutes"] | 60;
    if (durationMinutes < 1 || durationMinutes > 1440) {
      Serial.println("Ignoring command with an invalid manual duration.");
      return;
    }
    manualStopAt = millis() + static_cast<unsigned long>(durationMinutes) * 60000UL;
    setMotor(true);
  } else {
    manualStopAt = 0;
    setMotor(false);
  }

  lastCommandId = commandId;
  preferences.putString("lastCommandId", lastCommandId);
  sendTelemetry();
}

void pollCommand() {
  if (WiFi.status() != WL_CONNECTED || deviceToken.isEmpty() || strlen(TLS_ROOT_CA_CERT) == 0) return;

  configureTls();
  HTTPClient http;
  if (!http.begin(tlsClient, String(API_BASE_URL) + "/api/devices/command")) return;
  http.setTimeout(10000);
  http.addHeader("X-AgroSmart-Device", deviceId);
  http.addHeader("X-AgroSmart-Token", deviceToken);
  const int status = http.GET();
  if (status == HTTP_CODE_OK) {
    StaticJsonDocument<256> command;
    if (!deserializeJson(command, http.getString())) applyCommand(command);
  } else if (status > 0) {
    Serial.printf("Command poll returned HTTP %d.\n", status);
  } else {
    Serial.printf("Command poll failed: %s\n", http.errorToString(status).c_str());
  }
  http.end();
}

void updateIrrigation() {
  const unsigned long now = millis();
  const int moisture = readMoisturePercent();

  if (currentMode == "automatic") {
    if (moisture < 30) setMotor(true);
    else if (moisture >= 60) setMotor(false);
  } else if (manualStopAt && static_cast<int32_t>(now - manualStopAt) >= 0) {
    setMotor(false);
    manualStopAt = 0;
    timerExpiredPending = true;
  }

  const String band = moistureBand(moisture);
  const bool thresholdChanged = band != lastMoistureBand;
  if (timerExpiredPending || thresholdChanged || motorOn != lastReportedMotorOn) {
    sendTelemetry(timerExpiredPending ? "manual_timer_expired" : nullptr);
  } else if (now - lastTelemetryAt >= TELEMETRY_INTERVAL_MS) {
    sendTelemetry(nullptr, true);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(MOTOR_RELAY_PIN, OUTPUT);
  setMotor(false, true); // Force relay to safe OFF state immediately at boot
  pinMode(RS485_DE_RE_PIN, OUTPUT);
  digitalWrite(RS485_DE_RE_PIN, LOW);
  pinMode(LDR_PIN, INPUT);
  analogReadResolution(12);
  dht.begin();

  Serial2.begin(9600, SERIAL_8N1, RS485_RX_PIN, RS485_TX_PIN);

  deviceId = getDeviceId();
  preferences.begin("agrosmart", false);
  deviceToken = preferences.getString("deviceToken", "");
  lastCommandId = preferences.getString("lastCommandId", "");
  configureTls();

  wifiManager.addParameter(&pairingCodeParameter);
  wifiManager.setConfigPortalTimeout(300);
  if (!wifiManager.autoConnect(DEVICE_AP_NAME)) {
    Serial.println("Wi-Fi setup timed out. Restarting safely with motor off.");
    ESP.restart();
  }

  networkTimeReady = synchronizeClock();
  for (int attempt = 0; !networkTimeReady && attempt < 60; attempt++) {
    delay(500);
    networkTimeReady = synchronizeClock();
  }
  if (!networkTimeReady) {
    Serial.println("Network time unavailable. HTTPS remains disabled until time sync succeeds.");
  }
  probeApiHealth();

  if (deviceToken.isEmpty()) {
    if (strlen(pairingCodeParameter.getValue()) == 12) {
      pendingPairingCode = String(pairingCodeParameter.getValue());
    } else {
      Serial.println("Open the device setup AP and enter the pairing code.");
      wifiManager.setBreakAfterConfig(true);
      const bool portalConnected = wifiManager.startConfigPortal(DEVICE_AP_NAME);
      pendingPairingCode = String(pairingCodeParameter.getValue());
      if (!portalConnected) {
        Serial.println("Setup saved, but Wi-Fi is not connected yet; pairing will wait for connectivity.");
      }
      if (pendingPairingCode.length() != 12) {
        Serial.println("No valid pairing code was submitted in the setup portal.");
      } else {
        Serial.println("Pairing code received; waiting for secure connection.");
      }
    }
  }

  attemptPairing();

  lastTelemetryAt = millis();
  lastMoistureBand = moistureBand(readMoisturePercent());
  if (!deviceToken.isEmpty() && networkTimeReady) {
    lastTelemetryAt -= TELEMETRY_INTERVAL_MS;
    sendTelemetry();
  }
}

void loop() {
  const unsigned long now = millis();
  if (!lastSensorDiagnosticsAt
      || now - lastSensorDiagnosticsAt >= SENSOR_DIAGNOSTICS_INTERVAL_MS) {
    lastSensorDiagnosticsAt = now;
    logSensorReadings();
  }

  if (WiFi.status() != WL_CONNECTED) {
    setMotor(false);
    const unsigned long reconnectNow = millis();
    if (!lastWifiReconnectAt || reconnectNow - lastWifiReconnectAt >= WIFI_RECONNECT_INTERVAL_MS) {
      lastWifiReconnectAt = reconnectNow;
      wifiReconnectAttempts++;
      Serial.printf("Wi-Fi disconnected; reconnect attempt %d/%d\n",
                     wifiReconnectAttempts, WIFI_MAX_RECONNECT_ATTEMPTS);

      if (wifiReconnectAttempts >= WIFI_MAX_RECONNECT_ATTEMPTS) {
        Serial.println("Max reconnect attempts reached — opening WiFi config portal.");
        Serial.printf("Connect to AP '%s' to set new WiFi credentials.\n", DEVICE_AP_NAME);
        WiFi.disconnect(true);
        wifiManager.setConfigPortalTimeout(180);   // 3-minute portal timeout
        if (wifiManager.startConfigPortal(DEVICE_AP_NAME)) {
          Serial.println("New WiFi credentials saved — connected!");
          wifiReconnectAttempts = 0;
          lastWifiReconnectAt = 0;
        } else {
          Serial.println("Config portal timed out — will retry reconnect cycle.");
          wifiReconnectAttempts = 0;  // reset and try normal reconnect again
          lastWifiReconnectAt = 0;
        }
      } else {
        WiFi.reconnect();
      }
    }
    delay(1000);
    return;
  }

  // WiFi is connected — reset reconnect counter
  if (wifiReconnectAttempts > 0) {
    Serial.println("Wi-Fi reconnected successfully.");
    wifiReconnectAttempts = 0;
  }

  if (!networkTimeReady) {
    networkTimeReady = synchronizeClock();
    if (!networkTimeReady) {
      delay(1000);
      return;
    }
    attemptPairing();
    if (!deviceToken.isEmpty()) lastTelemetryAt = millis() - TELEMETRY_INTERVAL_MS;
  }

  probeApiHealth();
  attemptPairing();
  const unsigned long commandPollNow = millis();
  if (commandPollNow - lastCommandPollAt >= COMMAND_POLL_MS) {
    lastCommandPollAt = commandPollNow;
    pollCommand();
  }
  updateIrrigation();
  delay(250);
}
