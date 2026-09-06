# Bonsho (বংশ) 🌳

> **বংশ (Bonsho)** is an open-source, privacy-first family tree visualizer designed specifically for Bangladeshi lineage traditions. It stores **zero data on servers** and renders trees completely in the browser from simple 2-column Google Sheets or direct copy-paste.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Hosted on GitHub Pages](https://img.shields.io/badge/Hosted%20on-GitHub%20Pages-success.svg)](https://bonsho-bd.github.io)
[![Zero Data Retention](https://img.shields.io/badge/Data%20Retention-Zero-green.svg)](#privacy-guarantee)
[![Bilingual](https://img.shields.io/badge/Language-বাংলা%20%2F%20English-orange.svg)](#bilingual-support)

---

## ✨ Features

- 🔒 **Zero Data Retention**: No database, no backend server, no cookies tracking you. Everything runs in your browser's local memory.
- 📋 **Ultra-Simple 2-Column Sheet Format**: No technical IDs or foreign keys required. Supports human-readable names and relations.
- 📋 **Direct Copy-Paste**: Copy rows from your Google Sheet or Excel and paste directly into Bonsho.
- 🇧🇩 **Designed for Bangladeshi Kinship**:
  - Handles patrilineal lineages (খান্দান / বংশ / বাড়ি).
  - Handles matrilineal / mother-centric societies (e.g. Garo / Khasi communities or maternal trees).
  - Multi-spouse (polygyny / remarriage) with clear child grouping.
  - Native Bengali honorifics & badges (মরহুম / মরহুমা / স্বর্গীয়).
  - Custom attributes: Attach any key-value information directly to family members.
- 🌐 **Bilingual (বাংলা / English)**: Keys and values work interchangeably in Bangla or English (`নাম` or `Name`, `স্ত্রী` or `Wife`, `সন্তান` or `Child`).
- ✏️ **Interactive In-App Editing**: Add children, add spouses, and edit details directly on the visual tree.
- 🔄 **Two-Way Google Sheets Sync**: Connect your private Google Sheet via Google Drive Picker (read & write directly to your sheet with 0 server transit).
- 💾 **Poster Export**: Export high-resolution posters (PNG) of your tree for family reunions (মিলনমেলা).

---

## 📖 Complete Design & Architecture

For in-depth architectural details, data models, parser specifications, and Google Sheets integration flows, read the complete design document:

👉 **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation
```bash
# Clone the repository
git clone https://github.com/bonsho-bd/bonsho-bd.github.io.git
cd bonsho-bd.github.io

# Install dependencies
npm install

# (Optional) Setup Google Sheets Sync locally
cp .env.example .env.local
# Add your VITE_GOOGLE_CLIENT_ID to .env.local

# Start the local development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Google Sheets Sync Setup (গুগল শিট সিঙ্ক কনফিগারেশন)

Bonsho-তে গুগল শিটের সাথে দ্বি-মুখী সিঙ্কের জন্য Google Identity Services (GIS) OAuth 2.0 Web Client ID প্রয়োজন। টোকেন বা Client ID কনফিগার না থাকলে UI-তে "গুগল শিট" বাটনটি ডিসেবল থাকবে (ব্যবহারকারী তখনও পেস্ট দিয়ে কাজ করতে পারবেন)।

### ১. Google Cloud Console থেকে Client ID তৈরি করার নিয়ম

1. [Google Cloud Console](https://console.cloud.google.com/)-এ যান।
2. নতুন একটি প্রজেক্ট তৈরি করুন (বা পূর্বের প্রজেক্ট সিলেক্ট করুন)।
3. **APIs & Services > Library**-তে গিয়ে এই দুটি API এনাবল করুন:
   - **Google Sheets API**
   - **Google Drive API**
4. **APIs & Services > OAuth consent screen**-এ যান:
   - User Type: **External** সিলেক্ট করে **Create** চাপুন।
   - App Name দিন `Bonsho`, সাপোর্ট ইমেইল ও ডেভেলপার ইমেইল দিয়ে সেভ করুন।
   - Scopes-এ গিয়ে যুক্ত করুন:
     - `https://www.googleapis.com/auth/drive.file`
     - `https://www.googleapis.com/auth/spreadsheets`
5. **APIs & Services > Credentials**-এ যান:
   - **Create Credentials** > **OAuth client ID** সিলেক্ট করুন।
   - Application type: **Web application** সিলেক্ট করুন।
   - Name: `Bonsho Web Client`
   - **Authorized JavaScript origins**-এ নিচের URL-গুলো যুক্ত করুন:
     - `https://bonsho-bd.github.io` (প্রোডাকশন সাইটের জন্য)
     - `http://localhost:5173` (লোকাল ডেভেলপমেন্টের জন্য)
   - **Create** বাটনে ক্লিক করুন এবং প্রাপ্ত **Client ID**-টি কপি করে রাখুন (দেখতে `xxxxxxxx.apps.googleusercontent.com`-এর মতো)।
6. **টেস্টিং ব্যবহারকারী বা অ্যাপ পাবলিশ (Important - Error 403 এড়াতে)**:
   - প্রজেক্টটি ডিফল্টভাবে **"Testing"** মোডে থাকে। তাই লগইন করতে **APIs & Services > OAuth consent screen**-এ যান:
     - **বিকল্প ১ (টেস্ট করার জন্য)**: **Test users** সেকশনে গিয়ে **+ ADD USERS** ক্লিক করুন এবং আপনার গুগল ইমেইল (`mahdibuet3@gmail.com`) যুক্ত করে **Save** করুন।
     - **বিকল্প ২ (সবার জন্য উন্মুক্ত করতে)**: **Publishing status**-এর নিচে **PUBLISH APP** বাটনে ক্লিক করে কনফার্ম করুন। (এরপর লগইনের সময় "Google hasn't verified this app" আসলে **Advanced** > **Go to bonsho-bd.github.io (unsafe)** ক্লিক করলেই সাইন-ইন হয়ে যাবে)।
7. *(ঐচ্ছিক)* Google Drive Picker ব্যবহারের জন্য Credentials পেজ থেকে **Create Credentials > API Key** তৈরি করে নিতে পারেন।

---

### ২. GitHub Repository Variables-এ টোকেন/Client ID যুক্ত করার নিয়ম (Deployment)

GitHub Pages-এ স্বয়ংক্রিয়ভাবে বিল্ড হওয়ার সময় Client ID ইনজেক্ট করতে নিচের ধাপগুলো অনুসরণ করুন:

1. আপনার গিটহাব রিপোজিটরিতে যান: [https://github.com/bonsho-bd/bonsho-bd.github.io](https://github.com/bonsho-bd/bonsho-bd.github.io)
2. রিপোজিটরির **Settings** ট্যাবে যান।
3. বাঁপাশের মেনু থেকে **Secrets and variables** > **Actions** সিলেক্ট করুন।
4. **Variables** ট্যাবে ক্লিক করুন (অথবা **Secrets** ট্যাবেও রাখতে পারেন)।
5. **New repository variable** বাটনে ক্লিক করুন:
   - **Name**: `VITE_GOOGLE_CLIENT_ID`
   - **Value**: আপনার কপি করা Google Client ID (যেমন: `123456789-abcdef.apps.googleusercontent.com`)
   - **Add variable** চাপুন।
6. *(ঐচ্ছিক)* একইভাবে API Key-এর জন্য আরেকটি ভ্যারিয়েবল যোগ করুন:
   - **Name**: `VITE_GOOGLE_API_KEY`
   - **Value**: আপনার Google API Key
7. **ডিপ্লয়মেন্ট ট্রিগার করুন**:
   - রিপোজিটরির **Actions** ট্যাবে গিয়ে **Deploy to GitHub Pages** ওয়ার্কফ্লোটি **Run workflow** করুন (বা `main` ব্রাঞ্চে একটি কমিট পুশ করুন)।
   - GitHub Actions বিল্ড চলাকালীন স্বয়ংক্রিয়ভাবে এই ভ্যারিয়েবলটি বান্ডল করে নেবে এবং লাইভ সাইটে গুগল শিট সিঙ্ক চালু হয়ে যাবে!

---

## 🔒 Privacy Guarantee

Bonsho does not own or store any database. All operations happen client-side in browser memory. When connecting to Google Sheets, requests are made directly between your browser and Google's official APIs using an ephemeral token.

