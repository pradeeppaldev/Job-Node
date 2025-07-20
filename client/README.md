# 💼 Job Node

**Job Node** is a full-stack job portal platform that allows companies to post jobs and candidates to apply seamlessly. Built using the MERN stack, it supports secure authentication, real-time job applications, and responsive design.

---

## 🚀 Features

### ✅ For Companies
- Register & Login securely with JWT
- Create, edit, and delete job postings
- View list of applicants for each job
- Manage company profile with logo upload (Cloudinary integration)

### 👨‍💼 For Users
- Register & Login via **Clerk**
- Apply to jobs with resume upload
- Track previously applied jobs
- View job details and company info

### 🌐 General
- Fully responsive UI (mobile + desktop)
- Protected routes for both company and user
- Centralized error handling & toast notifications
- Real-time application tracking with MongoDB
- RESTful API structure using Express

---

## 🛠️ Tech Stack

| Frontend        | Backend         | Database  | Authentication |
|----------------|-----------------|-----------|----------------|
| React + TailwindCSS | Node.js + Express | MongoDB Atlas | Clerk + JWT     |

Other Tools:
- Axios
- Cloudinary (image upload)
- Multer (file handling)
- React Toastify (alerts)
- Moment.js (timestamps)

---

## 📁 Project Structure (Simplified)

/client → React frontend
/server → Node.js backend
├── models
├── routes
├── controllers
├── middlewares
└── utils

---

## 🧪 Setup Instructions

### 🔧 Backend

```bash
cd server
npm install
npm run dev
