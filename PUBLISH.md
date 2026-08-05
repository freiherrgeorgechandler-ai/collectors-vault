# Publish Collector's Vault APK (free)

**Cheapest & easiest path:** GitHub builds the APK for free in the cloud.  
You download it and install on phones (sideload). **No Android Studio. No Play Store fee ($25).**

Google Play Store is optional later and is **not free** (one-time $25 developer fee).

---

## One-time setup (about 10 minutes)

### 1. Create a free GitHub account + empty repo
1. Go to https://github.com/new  
2. Name it e.g. `collectors-vault`  
3. Keep it **Public** (private also works; free Actions minutes are limited)  
4. Do **not** add a README (empty repo)  
5. Click **Create repository**

### 2. Push this project (run in Command Prompt)

```bat
cd /d "C:\DevWeb\Projects\MyCollector's Vault V3.3"
git init
git add .
git commit -m "Collector Vault with free APK cloud build"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/collectors-vault.git
git push -u origin main
```

Replace `YOUR_USERNAME` and the repo name with yours.  
GitHub will ask you to sign in (browser or personal access token).

### 3. (Optional) Set your server URL for AI online
Repo → **Settings** → **Secrets and variables** → **Actions** → **Variables** → New:

| Name | Value |
|------|--------|
| `VITE_API_BASE_URL` | `http://103.253.14.249:3000` |

If you skip this, the workflow already defaults to that URL.

---

## Get the APK (every time)

1. Open your repo on GitHub  
2. Click **Actions**  
3. Open **Build Android APK**  
4. Click **Run workflow** → **Run workflow** (or just wait after a push)  
5. When it finishes green, open the run  
6. Download **collectors-vault-apk** → unzip → `app-debug.apk`

Install on Android: copy the APK to the phone → open it → allow “Install unknown apps” if asked.

---

## Share a download link (still free)

```bat
git tag v1.0.0
git push origin v1.0.0
```

That creates a **Release** with the APK attached (public download link).

---

## Important notes

- Keep your Express server running for **AI** and cloud sync when the phone is online.  
- Offline: vault browse/edit/export still works on the phone.  
- This is a **debug** APK (fine for you / friends). Play Store needs a signed release later.  
- Do **not** commit `.env` (API keys). It is already gitignored.
