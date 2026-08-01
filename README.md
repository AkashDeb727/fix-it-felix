# 🛠️ Fix-It Felix

> **An AI-powered civic issue reporting platform that helps citizens report infrastructure problems while enabling local authorities to prioritize and resolve them efficiently.**

---

## 🌐 Live Demo

🔗 **Website:** http://ai-civic-frontend.s3-website.ap-south-1.amazonaws.com

---

## 📖 Overview

**Fix-It-Felix** is a serverless web application that bridges the communication gap between citizens and municipal authorities.

Citizens can report civic issues such as:

- 🛣️ Potholes
- 💡 Broken streetlights
- 🗑️ Garbage dumps
- 🚰 Water leakage
- 🌳 Fallen trees
- 🚧 Road damage
- ⚠️ Other public infrastructure issues

Instead of manually classifying every complaint, **Google Gemini AI** analyzes the uploaded image, identifies the issue type, estimates its severity, and generates an AI-powered description, enabling authorities to respond faster and prioritize critical cases.

---

# ✨ Features

## 👥 Citizen Portal

- 📸 Upload complaint images
- 📍 Automatic location selection on map
- 🤖 AI-powered image analysis using Google Gemini
- 🧠 Automatic issue categorization
- 📝 AI-generated complaint description
- 🚨 AI severity assessment
- 📤 One-click complaint submission

---

## 🏛️ Admin Dashboard

- 📊 Real-time complaint statistics
- 🗺️ Interactive complaint map
- 📌 Complaint location visualization
- 📷 View uploaded complaint images
- 🔄 Update complaint status
- 📈 Track pending, in-progress, and resolved complaints

---

## 🤖 AI Capabilities

- Image understanding using **Google Gemini**
- Infrastructure issue detection
- Automatic categorization
- Severity prediction
- Context-aware complaint description generation

---

# 🏗️ Architecture

```text
Citizen
    │
    ▼
React + TypeScript Frontend
    │
Hosted on Amazon S3
    │
    ▼
Amazon API Gateway
    │
    ▼
AWS Lambda Functions
    │
    ▼
Google Gemini AI
    │
    ▼
Amazon DynamoDB
```

---

# ☁️ AWS Services Used

- Amazon S3
- AWS Lambda
- Amazon API Gateway
- Amazon DynamoDB
- IAM

---

# 🛠️ Tech Stack

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

# 🚀 Getting Started

## Clone the repository

```bash
git clone https://github.com/AkashDeb727/fix-it-felix.git
```

# 🎯 Future Enhancements

- 📱 Mobile application
- 🔔 Real-time complaint notifications
- 🛰️ Satellite imagery integration
- 📊 Predictive hotspot analysis
- 🗣️ Multilingual support
- 🤖 AI-based duplicate complaint detection

---

# 👥 Team

**Project Name:** **Fix-It-Felix**

Developed during the **MLH Hackathon**.

---
