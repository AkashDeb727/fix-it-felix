# 🛠️ Fix-It-Felix

An AI-powered civic issue reporting platform that enables citizens to report infrastructure problems such as potholes, broken streetlights, garbage dumps, water leakage, and more.

The platform automatically analyzes complaint images using Google Gemini AI, categorizes the issue, determines its severity, and displays complaints on an interactive map for authorities to manage efficiently.

---

## 🚀 Live Demo

🌐 **Website:** http://ai-civic-frontend.s3-website.ap-south-1.amazonaws.com

---

## ✨ Features

- 📸 Upload complaint with image
- 🤖 AI-powered image analysis using Google Gemini
- 🧠 Automatic issue categorization
- 📍 Location-based complaint mapping
- 🗺️ Interactive map with complaint markers
- 👨‍💼 Admin dashboard for authorities
- 📊 Real-time complaint statistics
- 🔄 Complaint status tracking
- ☁️ Serverless AWS backend

---

## 🏗️ Architecture

Frontend (React + TypeScript)
↓
Amazon S3 Static Website Hosting
↓
API Gateway
↓
AWS Lambda
↓
Amazon DynamoDB
↓
Google Gemini AI

---

## 🛠️ Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- Leaflet Maps

### Backend
- AWS Lambda
- API Gateway
- DynamoDB
- Amazon S3

### AI
- Google Gemini API

---

## 📦 Installation

Clone the repository

```bash
git clone https://github.com/AkashDeb727/fix-it-felix.git
```

Install dependencies

```bash
npm install
```

Create an environment file

```env
GEMINI_API_KEY=your_api_key
```

Run locally

```bash
npm run dev
```

---

## 📸 Screenshots

(Add screenshots here)

---

## 👥 Team

Built during the MLH Hackathon.

Project Name: **Fix-It-Felix**

---

## 📄 License

MIT License
