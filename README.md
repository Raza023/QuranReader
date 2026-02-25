
# Quran Majeed – Interactive Quran Web App

<p align="center">
  <img src="src/favicon.png" alt="Quran Majeed Logo" width="120" />
   Check it out here: https://raza023.github.io/QuranReader/
</p>

**Quran Majeed** is a feature-rich, interactive web application for reading, listening, and studying the Holy Quran. It supports multiple translations, audio recitations, word-by-word analysis, and a user-friendly interface for both desktop and mobile devices.

---

## 🌟 Features

### 📖 Quran Reading & Navigation

* **Surah & Juzz View** – Browse the Quran by Surah or Juzz.
* **Pagination** – Navigate through verses easily.
* **Search** – Quickly find any Surah or Juzz.

### 🎧 Audio Playback

* **Arabic Recitation** – High-quality recitations of each verse.
* **Urdu Translation Audio** – Listen to Urdu translations.
* **Repeat Mode** – Repeat verses or Surahs for memorization.
* **Background Playback** – Continue listening while using other apps.

### 🌐 Translations & Word-by-Word (WBW)

* **Urdu Translation** – Read Urdu translations for each verse.
* **Word-by-Word** – Breakdown of each Arabic word with Urdu/English meanings.
* **English Support** – Toggle between Urdu and English translations.

### 💡 User Experience

* **Dark/Light Mode** – Switch between themes.
* **Font Size Adjustment** – Resize text for comfortable reading.
* **Responsive Design** – Works on mobile, tablet, and desktop.

### 📤 Sharing & Offline Support

* **Share Verses** – Share verses with Arabic, translation, and WBW.
* **Offline Resume** – Auto-resume playback when connection is restored.

---

## 📱 Installation & Usage

### 🔹 Online Usage

1. Open the app in any modern browser.
2. Select a **Surah** or **Juzz** from the dropdown.
3. Navigate verses with pagination.
4. Use the audio player for recitation or translation.

### 🔹 Local Setup

```bash
# Clone repository
git clone https://github.com/Raza023/QuranReader.git

# Open in browser
cd quran-majeed
open index.html
```

---

## 🛠️ Tech Stack

* **Frontend**: HTML5, CSS3, JavaScript (ES6+)
* **Fonts**: Indopak Nastaleeq (Arabic), Noto Nastaliq Urdu
* **Audio**: MP3 recitations & translations
* **Data**: JSON files for Quran text, translations, metadata

---

## 📂 Project Structure

```
quran-majeed/
├── index.html          # Main HTML file
├── src/
│   ├── audio/          # Audio files
│   ├── fonts/          # Custom fonts
│   ├── script/         # JavaScript files
│   └── favicon.png     # App icon
├── README.md           # Documentation
└── LICENSE             # License info
```

---

## 🤝 Contributing

Contributions are welcome! Fork the repo and submit a pull request with improvements.

---

## 📜 License

Licensed under the **MIT License**. See [LICENSE](LICENSE).

---

## 🙏 Acknowledgments

### 📖 Quran Text & Translations
* **Urdu Translation** – by *Allama Sheikh Mohsin Ali Najfi*
* **Word-By-Word Urdu** – by *Hafiz Nazar Ahmed*
* **English Translation (Saheeh International)** – produced by three American Muslim women: *Umm Muhammad (Emily Assami)*, *Mary Kennedy*, and *Amatullah Bantley*
* **Word-By-Word English** – based on *Saheeh International*

### 🎙️ Audio Recitations
* **Arabic Recitation** – by *Mishary Rashid Alafasy*
* **Urdu Recitation** – by *Hussain Shaheed Mirza*

### ✍️ Fonts
* **Indopak Nastaleeq** (for Arabic)
* **Noto Nastaliq Urdu** (for Urdu)

---

## 📧 Contact

**Hassan Raza**
📩 [Email](mailto:imhraza023@gmail.com) | 🌍 [GitHub](https://github.com/Raza023)

---

## Firebase credentials (security)

This project can use Firebase Realtime Database for bookmarks. Do NOT commit your Firebase credentials.
Example `firebase-config.json` (place at project root):

```
{
  "apiKey": "YOUR_API_KEY",
  "authDomain": "YOUR_PROJECT.firebaseapp.com",
  "databaseURL": "FIREBASE_DATABASE_URL",
  "projectId": "YOUR_PROJECT",
  "storageBucket": "YOUR_PROJECT.appspot.com",
  "messagingSenderId": "SENDER_ID",
  "appId": "APP_ID"
}
```

Notes:
- General. Make sure to replace the placeholders (FIREBASE_DATABASE_URL) 
- Even with this file kept out of VCS, any credentials present in a client-side app can be observed by users who inspect network requests or page source. To fully hide credentials you must move database access to a server-side component (Cloud Function or your backend) using the Firebase Admin SDK, and have the frontend call your secure endpoints.
- Alternatively, tighten your Realtime Database Rules so only authenticated users (via Firebase Auth) can read/write bookmarks.

