---
description: How to convert the React Web App into an Android App using Capacitor and publish it.
---

# Convert React App to Android App (Capacitor)

We will use **Capacitor** to wrap your existing React Application into a native Android app.

## 1. Prerequisites
You **MUST** have **Android Studio** installed on your computer to build the final APK/App Bundle.
- [Download Android Studio](https://developer.android.com/studio)

## 2. Install Capacitor Dependencies
Run the following commands in your terminal to install the necessary tools:
```bash
npm install @capacitor/core
npm install -D @capacitor/cli
npm install @capacitor/android
```

## 3. Initialize Capacitor
Initialize the Capacitor configuration. 
- App Name: `AttendanceKit`
- App ID: `com.attendance.kit` (Unique identifier for Play Store)
- Web Dir: `dist` (Vite's default build output)

```bash
npx cap init AttendanceKit com.attendance.kit --web-dir dist
```

## 4. Build Your Web App
We need to generate the static files (HTML/CSS/JS) that will run inside the app.
```bash
npm run build
```
*This creates a `dist` folder.*

## 5. Add Android Platform
Create the Android project structure.
```bash
npx cap add android
```

## 6. Sync and Update
Copy the `dist` folder into the Android project.
```bash
npx cap sync
```

## 7. Open in Android Studio
This command opens the native project in Android Studio.
```bash
npx cap open android
```

## 8. Run on Device/Emulator
1. In Android Studio, wait for Gradle sync to finish.
2. Connect an Android phone via USB (with Developer Options > USB Debugging enabled) OR create an Emulator.
3. Click the green "Run" (Play) button in the top toolbar.

---

# How to Publish to Google Play Store

## 1. Google Play Console Account
1. Go to [Google Play Console](https://play.google.com/console).
2. Sign up and pay the **$25 one-time registration fee**.
3. Verify your identity.

## 2. Generate Signed App Bundle (AAB)
1. Open your project in **Android Studio** (`npx cap open android`).
2. Go to **Build** > **Generate Signed Bundle / APK**.
3. Select **Android App Bundle** (AAB) -> Next.
4. **Key Store Path**: Click "Create new".
   - Save it somewhere safe (e.g., `C:\Users\savya\keystores\attendance-key.jks`).
   - Set a strong password.
   - Fill in the Certificate details (Name, Organization, etc.).
   - **IMPORTANT**: Never lose this keystore file or password. You cannot update your app without it.
5. Select the key you just created.
6. Select **release** variant.
7. Click **Finish**.
8. Android Studio will generate the `.aab` file (usually in `android/app/release/`).

## 3. Create Store Listing
1. In Google Play Console, click **Create App**.
2. Enter App Name ("Attendance Kit"), Language, and App Type (Free/App).
3. **App Dashboard**: Complete the setup steps:
   - **Main Store Listing**: Upload Icon (512x512), Feature Graphic (1024x500), Screenshots, Description.
   - **Content Rating**: Fill out the questionnaire.
   - **Target Audience**: Select age group (e.g., 18+).
   - **Data Safety**: Declare what data you collect (you are collecting files/names locally, so mostly "No data collected" unless you implemented cloud sync).

## 4. Release to Production
1. In the Dashboard, go to **Production**.
2. Click **Create new release**.
3. Upload the `.aab` file you generated in Step 2.
4. Enter release notes (e.g., "Initial Release").
5. Click **Next** -> **Start Rollout to Production**.

Your app will go into "In Review" status. This usually takes 1-3 days. Once approved, it will be live on the Play Store!
