# 🚀 ResumeCraft - AI-Powered LaTeX Resume Builder

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![React 18](https://img.shields.io/badge/react-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.2+-blue.svg)](https://www.typescriptlang.org/)
[![Made with Supabase](https://img.shields.io/badge/Made%20with-Supabase-green)](https://supabase.com)

**ResumeCraft** is a professional resume builder that leverages the power of AI and the elegance of LaTeX. Create stunning, ATS-friendly resumes with a real-time editor, live PDF previews, and intelligent content generation.

---

## ✨ Features

- 🤖 **AI-Powered Assistance**: Smart content generation and job description tailoring with Google Gemini.
- 📝 **Real-Time LaTeX Editor**: Full control with a Monaco-powered editor for precise resume crafting.
- 👀 **Live PDF Preview**: Instantly see your compiled PDF as you type.
- 📄 **Professional Templates**: Choose from a selection of beautifully designed, ATS-friendly LaTeX templates.
- 🔒 **Secure Cloud Storage**: Your data is protected with Supabase's enterprise-grade security, including Row Level Security.
- 📱 **Responsive Design**: A seamless experience on desktop, tablet, and mobile devices.

## 🏗️ Architecture

- **Frontend**: **React 18** with **TypeScript** and **Vite**, styled with **Tailwind CSS**.
- **Backend**: **FastAPI** (Python 3.11+) providing a powerful asynchronous API.
- **Database**: **Supabase PostgreSQL** for secure and scalable data storage.
- **AI Engine**: **Google Gemini** for intelligent text generation.
- **Document Engine**: On-the-fly **LaTeX** compilation for professional PDF generation.

---

## 🚀 Getting Started: Deploying to Production (Netlify + Render)

This project is designed for a modern, decoupled deployment. The frontend is hosted on **Netlify** for maximum speed, and the backend is hosted on **Render** for its robust free tier.

### Step 1: Deploy the Backend to Render

First, we will deploy the Python backend. The `render.yaml` file in this repository automates the initial setup.

1.  **Create a Render Account:** Sign up at [render.com](https://render.com) using your GitHub account.
2.  **Create a Blueprint:**
    *   On your dashboard, click **New +** and select **Blueprint**.
    *   Connect your GitHub repository. Render will automatically detect the `render.yaml` file.
    *   Give your service a name (e.g., `resumecraft-backend`) and click **Apply**.
3.  **Add Environment Variables:** This is the most critical step. Go to your new service's **Environment** tab and add the following variables.
    *   **Add these as individual environment variables (Key-Value pairs):**
        *   `GEMINI_API_KEY`: Your secret key from Google AI Studio.
        *   `SECRET_KEY`: A long, random string you generate for security.
        *   `DATABASE_URL`: Your full PostgreSQL connection string from Supabase.
        *   `SUPABASE_URL`: Your Supabase project URL.
        *   `SUPABASE_ANON_KEY`: Your Supabase public `anon` key.
        *   `SUPABASE_SERVICE_KEY`: Your Supabase secret `service_role` key.
        *   `SUPABASE_JWT_SECRET`: Your Supabase JWT Secret from the project's API settings.
        *   `CORS_ALLOWED_ORIGINS`: **Leave this blank for now.** We will fill this in after deploying the frontend.
4.  **Get Your Backend URL:** After the deployment succeeds, your service will have a public URL like `https://resumecraft-backend.onrender.com`. **Copy this URL.**

### Step 2: Deploy the Frontend to Netlify

Now, we'll deploy the React frontend.

1.  **Create a Netlify Account:** Sign up at [netlify.com](https://netlify.com) using your GitHub account.
2.  **Create a New Site:**
    *   On your dashboard, click **Add new site** and select **Import an existing project**.
    *   Connect the same GitHub repository.
    *   Netlify will automatically detect and use the settings in your `netlify.toml` file.
3.  **Add Environment Variables:** Go to **Site settings > Build & deploy > Environment > Environment variables** and click **Edit variables**. Add the following:
    *   `VITE_SUPABASE_URL`: Your public Supabase project URL.
    *   `VITE_SUPABASE_ANON_KEY`: Your public Supabase `anon` key.
    *   `VITE_API_BASE_URL`: **The full URL to your Render backend from Step 1**, including `/api` at the end (e.g., `https://resumecraft-backend.onrender.com/api`).
4.  **Deploy:** Click **Deploy site**. Once finished, Netlify will give you a public URL for your frontend, like `https://my-awesome-resume-app.netlify.app`. **Copy this URL.**

### Step 3: Connect the Frontend and Backend

The final step is to tell your backend to accept requests from your frontend.

1.  Go back to your backend service on **Render**.
2.  Navigate to the **Environment** tab.
3.  Find the `CORS_ALLOWED_ORIGINS` variable and set its value to **the Netlify URL you just copied** (e.g., `https://my-awesome-resume-app.netlify.app`).
4.  Save the changes. This will cause your backend to restart with the new setting.

### Step 4: Keep Your Free Backend Awake (IMPORTANT)

Render's free services "spin down" after 15 minutes of inactivity, causing a 30-40 second delay for the next user. To prevent this, use a free service to ping your backend every 10-14 minutes.

1.  **Sign up for a free cron job service** like [UptimeRobot](https://uptimerobot.com/).
2.  **Create a new monitor** with the following settings:
    *   **Type:** `HTTP(s)`
    *   **URL:** Your backend's health check path: `https://your-backend-name.onrender.com/api/health`
    *   **Interval:** Every 10 or 14 minutes.

Your application is now fully deployed and configured to stay responsive!

---

## 💻 Local Development Setup

1.  **Clone & Install**: Clone the repo, then set up the backend and frontend dependencies.
    ```bash
    # Backend
    cd backend
    python3.11 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt

    # Frontend (in a new terminal)
    cd frontend
    npm install
    ```
2.  **Configure**: Create `backend/.env` and `frontend/.env` files from the examples and add your development keys.
3.  **Run**: Start the backend and frontend servers in separate terminals.
    ```bash
    # Terminal 1: Backend
    cd backend && uvicorn main:app --reload

    # Terminal 2: Frontend
    cd frontend && npm run dev
    ```
4.  **Access**:
    - Frontend: `http://localhost:5173`
    - Backend API Docs: `http://localhost:8000/api/docs`

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines.

### Development Process

1.  **Fork** the repository and create a new branch from `main`.
    - Branch Naming: `feature/your-idea` or `bugfix/the-issue`.
2.  Follow the **Local Development Setup** guide.
3.  Adhere to the code style (PEP 8 for Python, standard React/TypeScript practices).
4.  Commit your changes using the **Conventional Commits** format (e.g., `feat(editor): add new template`).
5.  Submit a **Pull Request** to the `main` branch with a clear description of your changes.

### Reporting Issues

- Use the GitHub Issues tab to report bugs or request features.
- Provide a clear title, detailed steps to reproduce, and expected vs. actual results.

## 📄 License

This project is licensed under the **MIT License**. See the `LICENSE` file for details. 