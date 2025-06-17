# 🚀 AI Chat Resume Editor Setup

## What We Built

You now have a **Cursor-style AI chat interface** for your resume builder! Here's what's new:

### ✨ Features
- **Split-screen layout**: LaTeX code on top, AI chat on bottom
- **Cursor-style diff viewer**: Green/red highlights showing exactly what changes
- **Natural language editing**: "Make my name bigger" → AI modifies LaTeX
- **Accept/Reject changes**: Review before applying modifications
- **Toggle view**: Switch between AI chat and PDF preview

## 🛠️ Installation Steps

### 1. Install Frontend Dependencies
```bash
cd frontend
npm install react-diff-viewer-continued diff
```

### 2. Set up Gemini API Key
Add your Google Gemini API key to your environment:

**Backend/.env** (create if doesn't exist):
```
GEMINI_API_KEY=your_gemini_api_key_here
```

**Get your API key from**: https://aistudio.google.com/app/apikey

### 3. Start the Services

**Backend:**
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm run dev
```

## 🎯 How to Use

1. **Open the Editor** - Go to any resume editor page
2. **Toggle AI Chat** - Click "AI Chat" in the header (default mode)
3. **Describe Changes** - Type what you want to change:
   - "Make my name bigger and bold"
   - "Add a skills section with Python, React, Node.js"
   - "Change the font of the experience section"
   - "Make the margins smaller"
4. **Review Changes** - AI shows diff view with green/red highlights
5. **Accept/Reject** - Click "Accept Changes" or "Cancel"
6. **Auto-compile** - PDF updates automatically after accepting

## 🔄 Workflow Example

```
You: "Make my name bigger and bold"
  ↓
AI: Shows diff with green highlighted changes
  ↓
You: Click "Accept Changes"  
  ↓
LaTeX updates automatically
  ↓
PDF recompiles with new formatting
```

## 🎨 UI Features

- **Split Layout**: 50/50 code editor and AI chat
- **Toggle View**: Switch between AI chat and PDF preview
- **Diff Viewer**: Cursor-style change preview
- **Real-time Chat**: Smooth animations and typing indicators
- **Visual Feedback**: Green dots showing AI status

## 🔧 Backend Architecture

- **New Route**: `/api/ai/chat` - Handles AI requests
- **Gemini Integration**: Uses Google's Gemini 1.5 Flash model with new SDK
- **Smart Prompting**: Specialized for LaTeX resume editing
- **Error Handling**: Graceful fallbacks if AI is unavailable

## 🔧 Troubleshooting

### AI Not Working?
1. Check that `GEMINI_API_KEY` is set in `backend/.env`
2. Restart the backend server after adding the API key
3. Get your API key from: https://aistudio.google.com/app/apikey
4. Make sure you're using the new Google GenAI SDK format

### Dependencies Issues?
Run these commands to ensure all packages are installed:
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend  
cd frontend
npm install
```

## 🚀 What's Next

The foundation is built! You can now:
- Add more AI capabilities (suggestions, templates)
- Improve the diff algorithm 
- Add voice input for requests
- Create AI-powered resume templates
- Add collaborative editing

**You've created a vibe-coding resume editor! 🎉** 