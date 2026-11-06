# Firebase setup

The existing Flask API remains responsible for AgroSmart's current prediction and
IoT endpoints. Firebase Authentication and the web SDK handle farmer accounts
and owner-scoped Firestore/Storage operations directly; no Admin credential or
service-account key belongs in the frontend.

1. Create a Firebase project and register a web app.
2. In Authentication, enable the Email/Password sign-in provider.
3. Create a Cloud Firestore database and enable Firebase Storage.
4. Copy `frontend/.env.example` to `frontend/.env.local` and fill in the web-app
   configuration values from Firebase Project settings. These web configuration
   values are public client identifiers; never put service-account credentials
   in this file.
5. From the repository root, deploy `firestore.rules` and `storage.rules` with
   the Firebase CLI (`firebase deploy --only firestore:rules,storage`).
6. Start the frontend and backend using the existing project commands.

Without those environment values the app deliberately remains in browser demo
mode. Demo profiles and farm data are local to that browser and are not Firebase
accounts or cloud backups.

## Firestore layout

- `users/{uid}`: the farmer's personal profile and farming preferences.
- `users/{uid}/farms/{farmId}`: one document per farm.
- `users/{uid}/farms/{farmId}/fields/{fieldId}`: one document per field.
- `users/{uid}/farms/{farmId}/fields/{fieldId}/readings/{readingId}`: sensor
  samples recorded from the ESP32 soil-monitoring and irrigation screens.

Firestore rules bind every operation to the signed-in UID. Sensor samples are
append-only, and Storage rules limit owner-scoped uploads to images under 5 MB.
The sensor screens sample the selected field no more than once per minute.
