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

---

# 🤖 Google Gemini AI

Google Gemini is integrated into multiple parts of the application.

### Complaint Processing

When a citizen submits an issue:

    Complaint Image + Information
              │
              ▼
       submitComplaint Lambda
              │
              ▼
        Google Gemini API
              │
              ▼
     ┌─────────────────────────┐
     │ Issue Classification    │
     │ Severity Assessment     │
     │ Description Generation  │
     └─────────────────────────┘
              │
              ▼
          DynamoDB

### AI Chatbot

Gemini also powers the application's chatbot functionality through the `chatbotQuery` Lambda, allowing citizens to interact with the system and receive AI-generated responses.

---

# ☁️ AWS Services Used

| AWS Service | Purpose |
|---|---|
| **Amazon S3** | Hosts the frontend and stores complaint images |
| **AWS Lambda** | Runs serverless backend logic |
| **Amazon API Gateway** | Provides REST API endpoints |
| **Amazon DynamoDB** | Stores complaint metadata and application data |
| **Amazon SES** | Handles email notifications |
| **IAM** | Manages permissions and access between AWS services |

---

# 🖥️ Application Screenshots

## 🏠 Citizen Home

![Home](screenshots/frontend/home.png)

---

## 📝 Report an Issue

![Report Issue](screenshots/frontend/report-issue-top.png)

![Report Issue](screenshots/frontend/report-issue-bottom.png)

---

## 🏛️ Admin Dashboard

![Admin Dashboard](screenshots/frontend/admin-dashboard.png)

---

# ☁️ AWS Infrastructure

The following screenshots show the AWS infrastructure used to deploy and operate the application.

### AWS Lambda

![AWS Lambda](screenshots/aws/lambda-functions.png)

### Amazon API Gateway

![API Gateway](screenshots/aws/api-gateway.png)

### Amazon DynamoDB

![DynamoDB](screenshots/aws/dynamodb.png)

### Amazon S3

![S3](screenshots/aws/s3.png)

---

# 🛠️ Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Leaflet

### Backend

- AWS Lambda
- Amazon API Gateway
- Amazon DynamoDB
- Amazon S3
- Amazon SES
- IAM

### AI

- Google Gemini API

---

# 📁 Project Structure

    fix-it-felix/
    │
    ├── architecture/
    │   └── architecture-diagram.png
    │
    ├── frontend/
    │   ├── src/
    │   ├── assets/
    │   ├── package.json
    │   └── ...
    │
    ├── lambda/
    │   ├── chatbotQuery.py
    │   ├── dashboardStats.py
    │   ├── getComplaints.py
    │   ├── submitComplaint.py
    │   └── updateStatus.py
    │
    ├── screenshots/
    │   ├── frontend/
    │   └── aws/
    │
    └── README.md

---

# 🚀 Getting Started

### Clone the repository

    git clone https://github.com/AkashDeb727/fix-it-felix.git
    cd fix-it-felix

### Run the frontend locally

    cd frontend
    npm install
    npm run dev

The frontend will be available at the local development URL provided by Vite.

> Backend AWS resources are already deployed for the live demo. Running the frontend locally requires the appropriate API configuration in `.env`.

---

# 🔮 Future Enhancements

- 📱 Mobile application
- 🔔 Real-time complaint notifications
- 🌍 Multilingual support
- 🤖 AI-based duplicate complaint detection
- 📊 Predictive hotspot analysis
- 🛰️ Satellite imagery integration
- 📈 Advanced analytics for municipal authorities

---

# 👥 Team

**Project:** **Fix-It Felix**

Developed during the **MLH Hackathon**.

### 👨‍💻 Akash Deb

- Designed and implemented the serverless AWS architecture
- Developed backend services using **AWS Lambda, API Gateway, DynamoDB, S3, SES, and IAM**
- Integrated **Google Gemini AI** for image analysis and complaint processing
- Implemented AI-powered issue categorization, severity assessment, and description generation
- Developed backend APIs for complaint submission, retrieval, dashboard statistics, and status management
- Implemented the AI chatbot backend using Gemini
- Configured and deployed AWS infrastructure
- Integrated the backend with the frontend

### 👨‍💻 Sameer Ghosh

- Developed the frontend using **React, TypeScript, Vite, and Tailwind CSS**
- Built the **Citizen Portal** and **Admin Dashboard**
- Implemented the interactive map using **Leaflet**
- Designed the UI/UX and responsive layouts
- Integrated the frontend with backend APIs

---

## ⭐ Support

If you found **Fix-It Felix** interesting, consider giving the repository a ⭐ on GitHub!
