# Render environment values

These are the exact non-secret values confirmed by this project:

```dotenv
PYTHON_VERSION=3.11.9
FIREBASE_PROJECT_ID=agrosmart-mp
```

`render.yaml` already sets both values for Blueprint deployments.

The backend also requires the following account-specific values for the
corresponding features. Their secret values are not present in this repository,
so they must be obtained from the project owner and entered directly in the
Render dashboard:

- `FIREBASE_SERVICE_ACCOUNT_JSON`: the full private service-account JSON for
  the `agrosmart-mp` Firebase project. Create a new key in Firebase Console →
  Project settings → Service accounts. Do not commit this JSON to GitHub.
- `CLOUDINARY_URL`: create a new Cloudinary API secret, then enter the
  Cloudinary connection URL in Render. Rotate any credentials previously
  shared in chat.
- `GEMINI_API_KEY` (optional): needed only for the AI chat endpoint.
- `GOOGLE_TTS_API_KEY` (optional): needed only for cloud Kannada text-to-speech.

Do not add `PORT` manually; Render supplies it. Do not place service-account,
Cloudinary, Gemini, or Google TTS secrets in frontend variables or GitHub.
