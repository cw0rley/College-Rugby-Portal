# 🏉 College Rugby Recruiting — Setup Guide

A React + Firebase web app for players looking to find college rugby programs.

---

## What's Included

- **826 programs** (514 men's, 312 women's) loaded from your spreadsheet
- **37 conference contacts** with clickable email links
- Search by school name, city, conference, or coach
- Filter by state, gender, GPA, tuition, and scholarship availability
- Click any program card to see full details and contact the coach

---

## Step 1 — Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it (e.g. "college-rugby-recruiting")
3. Disable Google Analytics (optional) → **Create project**
4. In the left sidebar → **Firestore Database** → **Create database**
   - Choose **Start in test mode** (you can lock it down later)
   - Pick your nearest region → **Done**
5. In the left sidebar → **Project Settings** (gear icon)
6. Under **Your apps** → click **</>** (Web) → Register app
7. Copy the `firebaseConfig` object shown

---

## Step 2 — Add Your Firebase Config

Open **both** of these files and replace the placeholder config:

- `src/App.jsx` (lines 8–15)
- `scripts/seed-firebase.js` (lines 16–23)

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};
```

---

## Step 3 — Install & Seed Firebase

```bash
# Install dependencies
npm install

# Upload all spreadsheet data to Firestore (run once)
npm run seed
```

This uploads all 826 programs and 37 conference contacts to your Firestore database.
You can re-run it anytime if the data changes — just clear the Firestore collections first.

---

## Step 4 — Run the App

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Step 5 — Deploy (Optional)

### Deploy to Firebase Hosting (free)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize hosting
firebase init hosting
# → Select your project
# → Public directory: dist
# → Single-page app: Yes
# → Don't overwrite index.html

# Build and deploy
npm run build
firebase deploy
```

Your app will be live at `https://your-project-id.web.app`

---

## Updating Data

If you update the spreadsheet:
1. Re-run the data export script to regenerate `programs.json` and `conferences.json`
2. Clear the Firestore `programs` and `conferences` collections
3. Run `npm run seed` again

---

## Firestore Security Rules (for production)

Once you're ready to go live, update your Firestore rules to read-only:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

This allows anyone to read the data but prevents any modifications from the browser.
