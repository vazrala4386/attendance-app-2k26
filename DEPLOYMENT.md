# 🚀 Deployment Guide: Hosting Your Attendance App for Free

This guide will help you host your backend server on **Render** and store your files on **Supabase** so that your application works 24/7, even when your laptop is shut off.

---

## 1. Supabase Storage Setup (Critical)
Since we moved from local storage to cloud storage, you must create a storage bucket.

1.  Log in to your [Supabase Dashboard](https://app.supabase.com/).
2.  Go to **Storage** (Bucket icon).
3.  Click **New Bucket**.
4.  Name: `attendance-files`
5.  Set to **Public**.
6.  Click **Create**.

---

## 2. Push Code to GitHub
Hosting services like Render connect to GitHub to get your code.

1.  Create a new repository on [GitHub](https://github.com) named `attendance-app-2k26`.
2.  In your project folder on your laptop, run:
    ```bash
    git init
    git add .
    git commit -m "Prepare for deployment"
    git branch -M main
    git remote add origin https://github.com/YOUR_USERNAME/attendance-app-2k26.git
    git push -u origin main
    ```

---

## 3. Deploy to Render.com
1.  Sign up at [Render.com](https://render.com) using GitHub.
2.  Click **New +** -> **Web Service**.
3.  Connect your `attendance-app-2k26` repository.
4.  **Settings:**
    *   **Name:** `attendance-backend`
    *   **Region:** Select one closest to you (e.g., Singapore).
    *   **Branch:** `main`
    *   **Runtime:** `Node`
    *   **Build Command:** `npm install`
    *   **Start Command:** `node server.js`
    *   **Instance Type:** `Free`
5.  **Environment Variables (Important):**
    Click **Advanced** -> **Add Environment Variable**. Add everything from your local `.env`:
    *   `SUPABASE_URL` = (Your Link)
    *   `SUPABASE_ANON_KEY` = (Your Key)
    *   `JWT_SECRET` = (Your Secret)
    *   `SMTP_EMAIL` = `udayavazrala@gmail.com`
    *   `SMTP_PASSWORD` = `hklaiineeqtuwizi`
6.  Click **Create Web Service**.

---

## 4. Update the Mobile App
Once Render displays "Live", copy your new URL (e.g., `https://attendance-backend.onrender.com`).

1.  Open `XYZ/attendance_app/lib/config.dart`.
2.  Update the `baseUrl`:
    ```dart
    static const String baseUrl = 'https://attendance-backend.onrender.com';
    ```
3.  Re-build your Flutter app (`flutter build apk`).

---

## 💡 Pro-Tips for Free Hosting
*   **Waking up:** The free server "sleeps" after 15 minutes of inactivity. The first person to use the app in the morning might see a 30-second delay while it "wakes up."
*   **Security:** Never share your `.env` file or upload it to GitHub. Render handles these variables securely in its dashboard.
