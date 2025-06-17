# 🤖 LaTeX Resume AI

A clean, simple AI-powered resume builder that generates professional LaTeX resumes using Google Gemini AI.

## ✨ Features

- **Simple AI Resume Generation**: Direct LaTeX generation using Google Gemini
- **PDF Resume Parsing**: Extract data from existing PDFs
- **Multiple LaTeX Templates**: Professional resume templates
- **Live LaTeX Compilation**: Real-time PDF preview
- **User Authentication**: Secure user accounts
- **Resume Management**: Save and manage multiple resumes

## 🏗️ Architecture

```
Resume_builder/
├── backend/                 # FastAPI backend
│   ├── routes/             # API endpoints
│   ├── services/           # Core business logic
│   ├── templates/cls/      # LaTeX template files
│   ├── static/             # Generated PDFs and logs
│   ├── database.py         # Database models
│   └── main.py            # FastAPI app
├── frontend/               # React frontend
└── requirements.txt        # Python dependencies
```

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment:**
   ```bash
   # Create .env file with:
   SECRET_KEY=your-secret-key
   GOOGLE_API_KEY=your-gemini-api-key
   ```

3. **Run backend:**
   ```bash
   cd backend
   python main.py
   ```

4. **Run frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 🧹 Cleanup

Run the cleanup script to remove temporary files:
```bash
python cleanup_temp_files.py
```

## 📁 Core Services

- **`simple_latex_generator.py`**: Main AI resume generation
- **`cv_parser.py`**: PDF resume parsing and data extraction
- **`latex.py`**: LaTeX compilation to PDF

## 🎯 Simple Approach

This system follows a straightforward approach:
1. Read LaTeX template (.cls file)
2. Send template + user data to AI
3. AI populates template with data
4. Compile LaTeX to PDF
5. Serve to user

Clean, simple, effective! 🎉 