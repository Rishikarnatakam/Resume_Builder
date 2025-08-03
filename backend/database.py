from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, DateTime, Text, Boolean, Integer, UniqueConstraint, select, cast
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import os
from utils.config import config
import uuid

# Database URL - read from environment
DATABASE_URL = config.DATABASE_URL

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    # echo=True,  # Commented out to reduce SQL logging clutter. Uncomment to enable.
    pool_recycle=180,  # Reduced for ngrok scenarios
    pool_pre_ping=True,
    pool_size=1,  # Supabase free tier: 1 persistent connection
    max_overflow=2,  # Reduced for ngrok (total 3 connections)
    pool_timeout=15,  # Reduced timeout for ngrok
    connect_args={
        "command_timeout": 20,  # Reduced query timeout for ngrok
        "server_settings": {
            "application_name": "resume_builder_backend"
        }
    }
)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

# Removed User model - using Supabase auth.users instead

class Resume(Base):
    __tablename__ = "resumes"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    title: Mapped[str] = mapped_column(String(200))
    template_name: Mapped[str] = mapped_column(String(100), default="resume")
    latex_content: Mapped[str] = mapped_column(Text)
    job_description: Mapped[str] = mapped_column(Text, nullable=True)
    resume_data: Mapped[str] = mapped_column(Text)  # JSON string
    ai_chat_session_id: Mapped[str] = mapped_column(String(100), nullable=True)
    pdf_path: Mapped[str] = mapped_column(String(500), nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AIChatSession(Base):
    __tablename__ = "ai_chat_sessions"
    
    id: Mapped[str] = mapped_column(String(100), primary_key=True, index=True)
    resume_id: Mapped[str] = mapped_column(String(36), index=True)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    cache_id: Mapped[str] = mapped_column(String(200), nullable=True)
    cache_expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    template_content: Mapped[str] = mapped_column(Text)
    form_data: Mapped[str] = mapped_column(Text)  # JSON string
    conversation_history: Mapped[str] = mapped_column(Text, default="[]")  # JSON string
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

def _ensure_uuid(val):
    if isinstance(val, uuid.UUID):
        return val
    # Handle asyncpg.pgproto.pgproto.UUID (has 'uuid' attribute)
    if hasattr(val, 'uuid'):
        return val.uuid
    return uuid.UUID(str(val))

class UserSubscription(Base):
    __tablename__ = "user_subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    razorpay_order_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)  # renamed
    plan_id: Mapped[str] = mapped_column(String(50), nullable=False)
    messages_used: Mapped[int] = mapped_column(Integer, default=0)
    message_quota: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    __table_args__ = (UniqueConstraint('user_id', name='_user_id_uc'),)

async def get_user_subscription(user_id: str, db: AsyncSession) -> UserSubscription | None:
    user_id_uuid = _ensure_uuid(user_id)
    stmt = select(UserSubscription).where(
        UserSubscription.user_id == user_id_uuid
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def create_user_subscription(
    db: AsyncSession,
    user_id: str,
    razorpay_order_id: str,
    plan_id: str,
    message_quota: int,
) -> UserSubscription:
    user_id_uuid = _ensure_uuid(user_id)
    new_subscription = UserSubscription(
        user_id=user_id_uuid,
        razorpay_order_id=razorpay_order_id,
        plan_id=plan_id,
        message_quota=message_quota
    )
    db.add(new_subscription)
    await db.commit()
    await db.refresh(new_subscription)
    return new_subscription

async def update_user_subscription(
    db: AsyncSession,
    subscription_id: str,
    **kwargs
) -> UserSubscription | None:
    sub_id_uuid = _ensure_uuid(subscription_id)
    stmt = select(UserSubscription).where(UserSubscription.id == sub_id_uuid)
    result = await db.execute(stmt)
    subscription = result.scalar_one_or_none()

    if subscription:
        for key, value in kwargs.items():
            setattr(subscription, key, value)
        await db.commit()
        await db.refresh(subscription)
    return subscription

# Dependency to get database session
async def get_db():
    try:
        async with SessionLocal() as session:
            try:
                yield session
            finally:
                await session.close()
    except Exception as e:
        # Debug logging removed for production
        # For connection issues, try to reconnect
        if "connection was closed" in str(e) or "ConnectionDoesNotExistError" in str(e):
            # Debug logging removed for production
            # Force cleanup for ngrok scenarios
            try:
                await engine.dispose()
            except:
                pass
        raise

# Initialize database
async def init_db():
    async with engine.begin() as conn:
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
        # Debug logging removed for production 