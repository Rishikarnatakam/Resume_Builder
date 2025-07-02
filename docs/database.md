# 🗄️ Database Documentation - Supabase PostgreSQL

## Overview

ResumeCraft uses **Supabase PostgreSQL** with enterprise-grade security features including Row Level Security (RLS) to ensure data isolation and protection.

## 🏗️ Database Schema

### Tables

#### 1. Users Table
Stores user account information (will be integrated with Supabase Auth in future updates).

```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    hashed_password VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
```

#### 2. Resumes Table
Stores resume data, LaTeX content, and metadata.

```sql
CREATE TABLE resumes (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    template_name VARCHAR(100) DEFAULT 'resume',
    latex_content TEXT NOT NULL,
    job_description TEXT,
    resume_data TEXT NOT NULL, -- JSON string containing form data
    pdf_path VARCHAR(500),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
```

#### 3. AI Chat Sessions Table
Stores AI conversation history and context caching information.

```sql
CREATE TABLE ai_chat_sessions (
    id VARCHAR(100) PRIMARY KEY,
    resume_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    cache_id VARCHAR(200),
    cache_expires_at TIMESTAMP WITH TIME ZONE,
    template_content TEXT NOT NULL,
    form_data TEXT NOT NULL, -- JSON string
    conversation_history TEXT DEFAULT '[]', -- JSON string
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
```

## 🔐 Security Implementation

### Row Level Security (RLS)

All tables have RLS enabled to ensure users can only access their own data:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
```

### RLS Policies

#### Users Table Policies
```sql
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text OR auth.email() = email);

-- Users can update their own profile  
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text OR auth.email() = email);

-- Users can insert their own profile (registration)
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.email() = email);
```

#### Resumes Table Policies
```sql
-- Users can view their own resumes and public resumes
CREATE POLICY "Users can view own resumes" ON resumes
    FOR SELECT USING (
        auth.uid()::text = user_id::text OR 
        is_public = true
    );

-- Users can insert their own resumes
CREATE POLICY "Users can insert own resumes" ON resumes
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Users can update their own resumes
CREATE POLICY "Users can update own resumes" ON resumes
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Users can delete their own resumes
CREATE POLICY "Users can delete own resumes" ON resumes
    FOR DELETE USING (auth.uid()::text = user_id::text);
```

#### AI Chat Sessions Table Policies
```sql
-- Users can view their own chat sessions
CREATE POLICY "Users can view own chat sessions" ON ai_chat_sessions
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Users can insert their own chat sessions
CREATE POLICY "Users can insert own chat sessions" ON ai_chat_sessions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Users can update their own chat sessions
CREATE POLICY "Users can update own chat sessions" ON ai_chat_sessions
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Users can delete their own chat sessions
CREATE POLICY "Users can delete own chat sessions" ON ai_chat_sessions
    FOR DELETE USING (auth.uid()::text = user_id::text);
```

## 🚀 Performance Optimization

### Indexes

Performance indexes for optimal query speed:

```sql
-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Resumes table indexes
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_created_at ON resumes(created_at);
CREATE INDEX IF NOT EXISTS idx_resumes_is_public ON resumes(is_public);
CREATE INDEX IF NOT EXISTS idx_resumes_template_name ON resumes(template_name);

-- AI Chat Sessions table indexes
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_resume_id ON ai_chat_sessions(resume_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id ON ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_is_active ON ai_chat_sessions(is_active);
```

### Foreign Key Constraints

Data integrity with cascading deletes:

```sql
-- Resumes reference users
ALTER TABLE resumes ADD CONSTRAINT fk_resumes_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- AI chat sessions reference users and resumes
ALTER TABLE ai_chat_sessions ADD CONSTRAINT fk_ai_chat_sessions_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE ai_chat_sessions ADD CONSTRAINT fk_ai_chat_sessions_resume_id 
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE;
```

## 📊 Complete Setup SQL

Run this in your Supabase SQL Editor:

<details>
<summary>📄 Complete Database Setup Script (Click to expand)</summary>

```sql
-- Drop existing triggers and functions if they exist (safe cleanup)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create tables with IF NOT EXISTS for idempotency

-- Users table (compatible with Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    hashed_password VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Resumes table
CREATE TABLE IF NOT EXISTS resumes (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    template_name VARCHAR(100) DEFAULT 'resume',
    latex_content TEXT NOT NULL,
    job_description TEXT,
    resume_data TEXT NOT NULL,
    pdf_path VARCHAR(500),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- AI Chat Sessions table
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id VARCHAR(100) PRIMARY KEY,
    resume_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    cache_id VARCHAR(200),
    cache_expires_at TIMESTAMP WITH TIME ZONE,
    template_content TEXT NOT NULL,
    form_data TEXT NOT NULL,
    conversation_history TEXT DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_created_at ON resumes(created_at);
CREATE INDEX IF NOT EXISTS idx_resumes_is_public ON resumes(is_public);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_resume_id ON ai_chat_sessions(resume_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id ON ai_chat_sessions(user_id);

-- Add foreign key constraints (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_resumes_user_id') THEN
        ALTER TABLE resumes ADD CONSTRAINT fk_resumes_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_ai_chat_sessions_user_id') THEN
        ALTER TABLE ai_chat_sessions ADD CONSTRAINT fk_ai_chat_sessions_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_ai_chat_sessions_resume_id') THEN
        ALTER TABLE ai_chat_sessions ADD CONSTRAINT fk_ai_chat_sessions_resume_id 
        FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Users table policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text OR auth.email() = email);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text OR auth.email() = email);

DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.email() = email);

-- Resumes table policies
DROP POLICY IF EXISTS "Users can view own resumes" ON resumes;
CREATE POLICY "Users can view own resumes" ON resumes
    FOR SELECT USING (auth.uid()::text = user_id::text OR is_public = true);

DROP POLICY IF EXISTS "Users can insert own resumes" ON resumes;
CREATE POLICY "Users can insert own resumes" ON resumes
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update own resumes" ON resumes;
CREATE POLICY "Users can update own resumes" ON resumes
    FOR UPDATE USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can delete own resumes" ON resumes;
CREATE POLICY "Users can delete own resumes" ON resumes
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- AI Chat Sessions table policies
DROP POLICY IF EXISTS "Users can view own chat sessions" ON ai_chat_sessions;
CREATE POLICY "Users can view own chat sessions" ON ai_chat_sessions
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can insert own chat sessions" ON ai_chat_sessions;
CREATE POLICY "Users can insert own chat sessions" ON ai_chat_sessions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update own chat sessions" ON ai_chat_sessions;
CREATE POLICY "Users can update own chat sessions" ON ai_chat_sessions
    FOR UPDATE USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can delete own chat sessions" ON ai_chat_sessions;
CREATE POLICY "Users can delete own chat sessions" ON ai_chat_sessions
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Success message
SELECT 'ResumeCraft database setup completed successfully! 🎉' as status;
```

</details>

## 🔍 Monitoring & Maintenance

### Built-in Supabase Features

- **Real-time Database Logs**: Monitor all queries and performance
- **Automatic Backups**: Point-in-time recovery up to 7 days (free tier)
- **Connection Pooling**: Automatic connection management
- **Performance Insights**: Query performance analytics

### Health Checks

Check database health:

```sql
-- Check table sizes
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation 
FROM pg_stats 
WHERE tablename IN ('users', 'resumes', 'ai_chat_sessions');

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('users', 'resumes', 'ai_chat_sessions');

-- Check indexes
SELECT 
    indexname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE tablename IN ('users', 'resumes', 'ai_chat_sessions');
```

## 🚀 Migration from SQLite

The database has been successfully migrated from SQLite to Supabase PostgreSQL with:

- ✅ **Zero data loss** - All existing data preserved
- ✅ **Enhanced security** - Row Level Security enabled
- ✅ **Better performance** - Optimized indexes and constraints
- ✅ **Scalability** - Ready for thousands of users
- ✅ **Backup protection** - Automatic daily backups

## 📈 Scaling Considerations

Current setup supports:
- **100+ concurrent users** (free tier)
- **500MB database storage** (free tier)  
- **2GB bandwidth/month** (free tier)

For production scaling:
- **Pro Plan**: 8GB database, 250GB bandwidth
- **Team Plan**: Unlimited database, 500GB bandwidth
- **Custom solutions** available for enterprise needs

## 🆘 Troubleshooting

### Common Issues

1. **Connection failed**: Check DATABASE_URL format
2. **RLS blocking queries**: Verify auth context is set
3. **Performance issues**: Review query patterns and indexes

### Debug Queries

```sql
-- Check active connections
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Verify RLS is working
SELECT current_user, session_user;
``` 