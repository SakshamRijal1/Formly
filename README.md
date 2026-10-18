# Formly
# Formly — Modern Online Form Builder

<p align="center">
  A full-stack form builder for creating, sharing, and managing online forms.
</p>

<p align="center">
  <strong>React · Node.js · Express · MongoDB</strong>
</p>


## 📌 Overview

Formly is a modern, full-stack web application inspired by Google Forms. It provides an intuitive platform for creating forms, collecting responses, and managing submissions through a centralized dashboard.

Built with the MERN stack, Formly combines a responsive user interface with secure authentication and a RESTful backend.

## ✨ Key Features

- **Authentication:** Email/password login, Google OAuth, email OTP verification, and password recovery.
- **Form Builder:** Create, edit, customize, and publish forms.
- **Question Types:** Support for multiple question formats, including text, multiple choice, checkboxes, ratings, and file uploads where implemented.
- **Form Sharing:** Publish forms and share public links.
- **Response Management:** Collect, organize, and review submissions.
- **Analytics Dashboard:** View form statistics and response insights.
- **User Profiles:** Manage account information and profile details.
- **Modern UI:** Responsive design with light and dark themes.
- **Media Uploads:** Image and file upload support where configured.

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| Frontend | React, Vite, Tailwind CSS |
| Routing & State | React Router, Context API |
| API Communication | Axios |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Authentication | JWT, HTTP-only cookies, Google OAuth |
| Email Services | Nodemailer, SMTP |
| File Uploads | Multer, ImageKit |
| Data Visualization | Recharts |
| Deployment | Vercel, Render |

## 🏗️ Architecture

```text
Frontend (React + Vite)
         |
         | REST API / HTTPS
         v
Backend (Node.js + Express)
         |
         +------ MongoDB Atlas
         |
         +------ Email / OTP Service
         |
         +------ Google OAuth
         |
         +------ Media Storage
```

## 🚀 Getting Started

### Prerequisites

- Node.js and npm
- MongoDB database
- Git

### Installation

```bash
git clone YOUR_REPOSITORY_URL
cd formly
npm install
```

Install backend dependencies:

```bash
cd server
npm install
```

### Environment Configuration

Configure the required environment variables for the frontend and backend, including:

- MongoDB connection string
- JWT secret
- Frontend URL
- SMTP credentials
- Google OAuth credentials
- Media storage credentials, if enabled

Keep all secrets in environment files and never commit them to Git.

### Run Locally

Start the backend:

```bash
cd server
npm run dev
```

Start the frontend in a separate terminal from the project root:

```bash
npm run dev
```

Open the local URL provided by Vite in your browser.

## 🔐 Security

- JWT-based authentication with HTTP-only cookies
- Password hashing
- Email verification and password recovery
- Protected backend routes
- CORS configuration for trusted frontend origins
- Server-side validation and authorization

## ☁️ Deployment

| Service | Platform |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| Database | MongoDB Atlas |

- **Live Application:** https://formly-green.vercel.app
- **API Base URL:** `https://formly-x8f0.onrender.com/api`

Production environment variables and OAuth callback URLs must match the deployed application configuration.

## 🔮 Future Improvements

- Advanced form analytics and exportable reports
- Collaborative form editing
- More customization options and question types
- Improved accessibility and mobile experience
- Automated testing and CI/CD

## 👨‍💻 Author

**Saksham Rijal**

Full-stack developer and creator of Formly.



<p align="center">
  Built with ❤️ using the MERN stack.
</p>
