# ResumeCraft

AI-powered LaTeX resume builder with real-time editing and PDF preview.

## Quick Start

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend  
cd frontend
npm install
npm run dev
```

## Environment Variables

**Backend (.env):**
```env
DATABASE_URL=postgresql+asyncpg://...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
GEMINI_API_KEY=your_gemini_key
SECRET_KEY=your_secret_key
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

**Frontend (.env):**
```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Database Setup

Run this in Supabase SQL Editor:

```sql
CREATE TABLE resumes (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(200) NOT NULL,
    template_name VARCHAR(100) DEFAULT 'resume',
    latex_content TEXT NOT NULL,
    job_description TEXT,
    resume_data TEXT NOT NULL,
    ai_chat_session_id VARCHAR(100),
    pdf_path VARCHAR(500),
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ai_chat_sessions (
    id VARCHAR(100) PRIMARY KEY,
    resume_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    cache_id VARCHAR(200),
    cache_expires_at TIMESTAMP,
    template_content TEXT NOT NULL,
    form_data TEXT NOT NULL,
    conversation_history TEXT DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    razorpay_order_id VARCHAR(100) NOT NULL UNIQUE,
    plan_id VARCHAR(50) NOT NULL,
    messages_used INTEGER DEFAULT 0,
    message_quota INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_ai_chat_sessions_resume_id ON ai_chat_sessions(resume_id);
CREATE INDEX idx_ai_chat_sessions_user_id ON ai_chat_sessions(user_id);
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);

-- Enable RLS
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own resumes" ON resumes FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own resumes" ON resumes FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own resumes" ON resumes FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own resumes" ON resumes FOR DELETE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own chat sessions" ON ai_chat_sessions FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own chat sessions" ON ai_chat_sessions FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own chat sessions" ON ai_chat_sessions FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own subscriptions" ON user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscriptions" ON user_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscriptions" ON user_subscriptions FOR UPDATE USING (auth.uid() = user_id);
```

## Deploy

- **Backend**: Render/Railway with `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Frontend**: Netlify/Vercel with `npm run build` 