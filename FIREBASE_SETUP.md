# Firebase setup

The existing Flask API remains responsible for AgroSmart's current prediction and
IoT endpoints. Firebase Authentication and Firestore handle farmer accounts and
owner-scoped data; this setup does not use Firebase Storage. No Admin credential
or service-account key belongs in the frontend. The frontend Firebase
configuration and Firebase Hosting deployment target the `agrosmart-mp` project
by default.

1. Sign in to the Google account that owns `agrosmart-mp`, or have its owner grant
   your account access to that Firebase/Google Cloud project.
2. In the Firebase console, select `agrosmart-mp`, register the web app, and
   confirm its web configuration matches the values in
   `frontend/.env.example`. The config is public client configuration, not a
   service-account key.
3. In the Firebase console, enable Authentication's Email/Password provider and
   create/enable Cloud Firestore. Add the Hosting domains
   (`agrosmart-mp.web.app` and `agrosmart-mp.firebaseapp.com`) to Authentication's
   authorized domains if they are not already listed. Authentication provider
   settings are configured in the console, not deployed by `firebase deploy`.
4. From the repository root, build and deploy Hosting and Firestore rules:

   ```powershell
   cd frontend
   npm install
   npm run build
   cd ..
   firebase login
   firebase projects:list
   firebase deploy --project agrosmart-mp --only hosting,firestore:rules
   ```

The Firebase CLI account must have permission to deploy Hosting, Firestore rules,
to `agrosmart-mp`. The explicit `--project` prevents deployment to a different
currently selected project. Hosting, Authentication, and Firestore use this same
Firebase project. Storage is not configured or deployed.

The Flask prediction, IoT, and image-upload API is hosted separately on Render;
Firebase Hosting does not run Flask. The frontend defaults to
`https://agrosmart-of05.onrender.com`; set `VITE_API_BASE_URL` to a different
HTTPS service URL only if you move the API. For local API development, copy
`frontend/.env.example` to `frontend/.env.local` and set
`VITE_API_BASE_URL=http://127.0.0.1:5000`.

The checked-in configuration defaults to the supplied `agrosmart-mp` web app.
For local development, copy `frontend/.env.example` to `frontend/.env.local` if
you want to override those defaults or set a different Flask API URL. The
Firebase values are public client identifiers; never put service-account
credentials in the frontend. For Cloudinary image uploads, set `CLOUDINARY_URL`
and `FIREBASE_SERVICE_ACCOUNT_JSON` as Render environment variables. The latter
is the JSON content of a Firebase service-account key for the same
`agrosmart-mp` project; never commit or expose it. The upload endpoint verifies
the signed-in Firebase ID token before uploading profile or field images.
Add these variables in the Render dashboard under the backend service's
Environment settings. Use a newly rotated Cloudinary secret; do not reuse any
secret shared in chat. After changing backend dependencies or code, redeploy the
Render service so the upload endpoint is available.

For ESP32 pairing, telemetry, and motor controls, the Render service also needs
`FIREBASE_SERVICE_ACCOUNT_JSON` and `FIREBASE_PROJECT_ID=agrosmart-mp`. The
service account must belong to this project and have access to Firestore and
Firebase Cloud Messaging. Keep its JSON only in Render's environment settings.
The pairing API returns `Device pairing is not configured on the backend.` when
`FIREBASE_SERVICE_ACCOUNT_JSON` is absent. Generate a Firebase Admin private key
from Firebase Console → Project settings → Service accounts, then add a
`FIREBASE_SERVICE_ACCOUNT_JSON` environment variable in Render containing the
entire downloaded JSON file. Confirm its `project_id` is `agrosmart-mp`, save
the Render environment changes, and redeploy. Never paste or commit this private
JSON.
The ESP32 calls Render over HTTPS; it does not receive Firebase Admin
credentials. Render's free service may sleep or restart, so API commands and
push delivery may be delayed while it wakes. The ESP32 timer and relay safety
must remain local and must not depend on the web page or Render staying online.

To enable browser push, create a Web Push certificate key pair in Firebase
Console → Project settings → Cloud Messaging. Set the public key as
`VITE_FIREBASE_VAPID_KEY` in the frontend build environment, then rebuild and
redeploy Hosting. Users must grant notification permission from the Irrigation
page. Push requires HTTPS and a browser that supports Firebase Messaging.
The public VAPID key is configured in `frontend/.env.example`; the associated
private key remains in Firebase and is never placed in the frontend.

## Firestore layout

- `users/{uid}`: the farmer's personal profile and farming preferences.
- `users/{uid}/crop_predictions/{predictionId}`: crop inputs and ranked
  recommendations saved after a successful web or voice prediction. Owners
  can edit a note and delete their prediction records.
- `users/{uid}/farms/{farmId}`: one document per farm.
- `users/{uid}/farms/{farmId}/fields/{fieldId}`: one document per field.
- `users/{uid}/farms/{farmId}/fields/{fieldId}/readings/{readingId}`: sensor
  history from earlier field-based telemetry.
- `users/{uid}/devices/{deviceId}`: backend-managed device ownership, selected
  optional farm/field assignment, editable display name, current mode and
  motor state, last-seen timestamp, latest live reading, and a short rolling
  accumulator for periodic samples. The farmer can read the device document
  but can only add/update/remove devices and issue commands through the
  authenticated Flask API.
- `users/{uid}/devices/{deviceId}/readings/{readingId}`: one five-sample
  average after five periodic one-minute sensor reports. Event reports update
  the live reading but are excluded from average history. The frontend shows
  live values only when the latest device report is less than 150 seconds old;
  sensor history remains available when the device is offline.
- `users/{uid}/devices/{deviceId}/commands/current`: latest backend-managed
  command polled by the paired ESP32.
- `users/{uid}/notification_tokens/{tokenId}`: per-browser FCM token registered
  by the signed-in user for push alerts.
- `device_pair_codes/{code}`: short-lived, single-use pairing code created and
  claimed only by the backend. Client Firestore access is denied.

Firestore rules bind every client operation to the signed-in UID. Sensor
readings are append-only; crop-prediction notes may be updated and owners may
delete their prediction records. Device pairing codes, device records,
commands, and telemetry writes use the Firebase Admin SDK on the backend; the
web client cannot write device state or commands directly. Firestore is
schemaless: deploying rules does not create empty collections or placeholder
records. The app creates user/farm/field records during profile setup, and the
backend creates device/readings records after pairing and telemetry.
The Crop page displays the latest 20 predictions, including those generated by
the voice assistant, with edit-note and delete actions.
The Devices page lets the owner select a device independently of farm/field
assignment. Weather, Soil Monitoring, Crop Recommendation, and Irrigation use
that device's latest live Firestore update. Irrigation graphs the latest 100
five-sample averages from the device history. Existing field-level history is
left intact.
Push alerts are event-triggered: moisture threshold changes, pump on/off
transitions, and manual watering timer expiry.

Upload the configurable starter in [firmware/README.md](./firmware/README.md)
only after checking the exact sensor models, wiring, calibration, relay
polarity, Modbus register map, and TLS root CA. The firmware turns the motor
relay OFF on boot and at manual timer expiry. Test the relay using a safe load
before connecting a pump.
