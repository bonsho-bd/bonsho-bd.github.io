# Bonsho (বংশ) 🌳

> **বংশ (Bonsho)** is an open-source, privacy-first family tree visualizer designed specifically for Bangladeshi lineage traditions. It stores **zero data on servers** and renders trees completely in the browser from simple 2-column Google Sheets, CSV/Excel files, or direct copy-paste.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Hosted on GitHub Pages](https://img.shields.io/badge/Hosted%20on-GitHub%20Pages-success.svg)](https://bonsho-bd.github.io/bonsho)
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
  - Custom attributes: গ্রামের বাড়ি, পেশা, রক্তের গ্রুপ, খেতাব (বীর মুক্তিযোদ্ধা, ইত্যাদি).
- 🌐 **Bilingual (বাংলা / English)**: Keys and values work interchangeably in Bangla or English (`নাম` or `Name`, `স্ত্রী` or `Wife`, `সন্তান` or `Child`).
- ✏️ **Interactive In-App Editing**: Add children, add spouses, and edit details directly on the visual tree.
- 🔄 **Two-Way Google Sheets Sync**: Connect your private Google Sheet via Google Drive Picker (read & write directly to your sheet with 0 server transit).
- 💾 **Local File & Poster Export**: Download your updated tree as `.csv`, `.xlsx`, or export high-resolution posters (PNG/PDF) for family reunions (মিলনমেলা).

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
git clone https://github.com/bonsho-bd/bonsho.git
cd bonsho

# Install dependencies
npm install

# Start the local development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔒 Privacy Guarantee

Bonsho does not own or store any database. All operations happen client-side in browser memory. When connecting to Google Sheets, requests are made directly between your browser and Google's official APIs using an ephemeral token.
