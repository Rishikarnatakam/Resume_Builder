from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, DateTime, Text, Boolean, Integer
from datetime import datetime
import os

# Database URL - use SQLite for simplicity
DATABASE_URL = "sqlite+aiosqlite:///./latex_resume_ai.db"

# Create async engine
engine = create_async_engine(DATABASE_URL, echo=True)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(100))
    hashed_password: Mapped[str] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Resume(Base):
    __tablename__ = "resumes"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(index=True)
    title: Mapped[str] = mapped_column(String(200))
    template_name: Mapped[str] = mapped_column(String(100), default="resume")
    latex_content: Mapped[str] = mapped_column(Text)
    job_description: Mapped[str] = mapped_column(Text, nullable=True)
    resume_data: Mapped[str] = mapped_column(Text)  # JSON string
    pdf_path: Mapped[str] = mapped_column(String(500), nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AIChatSession(Base):
    __tablename__ = "ai_chat_sessions"
    
    id: Mapped[str] = mapped_column(String(100), primary_key=True, index=True)
    resume_id: Mapped[int] = mapped_column(Integer, index=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)
    cache_id: Mapped[str] = mapped_column(String(200), nullable=True)
    cache_expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    template_content: Mapped[str] = mapped_column(Text)
    form_data: Mapped[str] = mapped_column(Text)  # JSON string
    conversation_history: Mapped[str] = mapped_column(Text, default="[]")  # JSON string
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Dependency to get database session
async def get_db():
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Initialize database
async def init_db():
    async with engine.begin() as conn:
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created successfully") 