# Pusula Demo Web

A lightweight web demo for Pusula: Kur'an, Ayet ve Dua iOS app. Users enter an emotion, the backend fetches a matching Quranic verse with AI commentary and audio playback.

## Setup

1. Install dependencies:
   npm install

2. Create .env.local (copy from .env.example):
   cp .env.example .env.local

3. Start development server:
   npm run dev

4. Open http://localhost:5173 in your browser

## Features

- Emotion-based verse lookup
- Word-by-word audio highlighting
- AI-generated commentary
- Share functionality
- Fully responsive (mobile/tablet/desktop)
- Dark theme

## Backend API

**POST /api/verse**
- Request: { emotion: string }
- Response: { verseId, arabic, turkish, commentary, audioUrl, ref }

Connected to: https://pusulaapp-production.up.railway.app

## Building

npm run build

Output: dist/ folder (ready for deployment if needed later)
