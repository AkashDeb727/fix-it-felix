# 🛠️ Fix-It Felix

> **An AI-powered civic issue reporting platform that enables citizens to report infrastructure issues while helping municipal authorities prioritize and resolve them efficiently using Google Gemini AI and AWS Serverless services.**

---

## 🌐 Live Demo

🔗 **Website:** http://ai-civic-frontend.s3-website.ap-south-1.amazonaws.com

---

## 📖 Overview

**Fix-It Felix** is a serverless AI-powered civic issue reporting platform that bridges the communication gap between citizens and municipal authorities.

Citizens can report infrastructure problems such as **potholes, broken streetlights, garbage dumps, water leakage, fallen trees, road damage, and other public infrastructure issues** by uploading an image and selecting the issue location.

The platform uses **Google Gemini AI** to analyze complaint images, automatically categorize the issue, assess its severity, and generate a detailed complaint description. The resulting complaints are stored in AWS and made available through an administrative dashboard for efficient prioritization and management.

---

## ✨ Features

### 👥 Citizen Portal

- 📸 Upload complaint images
- 📍 Select complaint location using an interactive map
- 🤖 AI-powered image analysis using Google Gemini
- 🧠 Automatic issue categorization
- 📝 AI-generated complaint description
- 🚨 AI-based severity assessment
- 📤 One-click complaint submission

### 🏛️ Admin Dashboard

- 📊 Complaint statistics
- 🗺️ Interactive complaint map
- 📌 Complaint location visualization
- 📷 View uploaded complaint images
- 🔄 Update complaint status
- 📈 Track Pending, In Progress, and Resolved complaints

### 🤖 AI Capabilities

- Image understanding using **Google Gemini**
- Infrastructure issue detection
- Automatic issue categorization
- Severity assessment
- AI-generated complaint descriptions
- AI-powered chatbot for civic issue assistance

---

# 🏗️ Architecture

The application follows a **serverless AWS architecture**, with Google Gemini providing AI-powered complaint analysis.

![Fix-It Felix Architecture](architecture/architecture-diagram.png)

### Architecture Flow

```text
Citizen
   │
   ▼
React + TypeScript Frontend
   │
   │ Hosted on Amazon S3
   ▼
Amazon API Gateway
   │
   ▼
AWS Lambda
   │
   ├── Google Gemini AI
   │
   ├── Amazon DynamoDB
   │
   └── Amazon S3
