# Collector's Vault — Android (Capacitor)

## Free APK (recommended)

See **[PUBLISH.md](./PUBLISH.md)** — GitHub Actions builds the APK in the cloud (no Android Studio).

## How features behave

| Feature | Offline | Online |
|--------|---------|--------|
| Browse / edit collection | Yes | Yes |
| Export PDF / Excel / CSV / JSON | Yes | Yes |
| AI Smart Fill / receipt scan | Disabled | Calls your Express server → Gemini |
| Sign-in vault sync | Local cache only | Yes |
| Server icon lookup | Skipped | Yes |

`VITE_API_BASE_URL` is baked into the APK at build time (native only). Browser builds still use same-origin.

## Local build (optional, needs Android Studio / SDK)

```bat
npm run mobile:prepare
cd android
gradlew.bat assembleDebug
```

APK: `android\app\build\outputs\apk\debug\app-debug.apk`
