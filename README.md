# 🛠️ Fix-It Felix

> **An AI-powered civic issue reporting platform that enables citizens to report infrastructure issues while helping municipal authorities prioritize and resolve them efficiently using Google Gemini AI and AWS Serverless services.**

---

## 🌐 Live Demo

🔗 **Website:** http://ai-civic-frontend.s3-website.ap-south-1.amazonaws.com

---

# 📖 Overview

**Fix-It Felix** is a serverless AI-powered civic issue reporting platform that bridges the communication gap between citizens and municipal authorities.

Citizens can easily report infrastructure issues such as potholes, broken streetlights, garbage dumps, water leakage, fallen trees, road damage, and other public infrastructure problems by simply uploading an image.

Instead of requiring manual classification, **Google Gemini AI** automatically analyzes the uploaded image, identifies the issue type, determines its severity, and generates a detailed complaint description. This enables municipal authorities to prioritize high-impact issues, streamline complaint management, and respond more efficiently.

---

# ✨ Features

## 👥 Citizen Portal

- 📸 Upload complaint images
- 📍 Select complaint location on an interactive map
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
- 📈 Track Pending, In Progress, and Resolved complaints

---

## 🤖 AI Capabilities

- Image understanding using **Google Gemini**
- Infrastructure issue detection
- Automatic issue categorization
- Severity prediction
- AI-generated complaint descriptions

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
- Amazon SES
- IAM

---

# 🛠️ Tech Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Leaflet Maps

## Backend

- AWS Lambda
- Amazon API Gateway
- Amazon DynamoDB
- Amazon S3
- Amazon SES
- IAM

## AI

- Google Gemini API

---

# 🚀 Getting Started

## Clone the repository

```bash
git clone https://github.com/AkashDeb727/fix-it-felix.git
```

---

# 🎯 Future Enhancements

- 📱 Mobile application
- 🔔 Real-time complaint notifications
- 🌍 Multilingual support
- 🤖 AI-based duplicate complaint detection
- 📊 Predictive hotspot analysis
- 🛰️ Satellite imagery integration
- 📈 Analytics dashboard for municipal authorities

---

# 👥 Team

**Project Name:** **Fix-It Felix**

Developed during the **MLH Hackathon**.

## 🤝 Team Contributions

### Akash Deb

- Designed the serverless AWS architecture
- Developed the backend using **AWS Lambda, Amazon API Gateway, Amazon DynamoDB, Amazon S3, Amazon SES, and IAM**
- Integrated **Google Gemini AI** for image analysis, issue categorization, severity assessment, and AI-generated complaint descriptions
- Built backend APIs for complaint submission, complaint management, and status updates
- Configured and deployed the cloud infrastructure on AWS
- Managed backend integration with the frontend

### Sameer Ghosh

- Developed the frontend using **React, TypeScript, Vite, and Tailwind CSS**
- Built the **Citizen Portal** and **Admin Dashboard**
- Implemented the interactive map using **Leaflet**
- Designed the UI/UX and responsive layouts
- Integrated the frontend with backend APIs

---

⭐ If you found this project interesting, consider giving it a **Star** on GitHub!
