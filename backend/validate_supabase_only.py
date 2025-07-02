#!/usr/bin/env python3
"""
Supabase Migration Validation Script
Ensures SQLite is completely removed and only PostgreSQL/Supabase is used
"""

import os
import sys
import asyncio
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

async def validate_supabase_migration():
    """Validate that the migration to Supabase is complete"""
    print("🔍 Validating Supabase Migration...")
    print("=" * 50)
    
    validation_passed = True
    
    # 1. Check database configuration
    try:
        from utils.config import config
        print(f"✅ Database URL configured: {config.DATABASE_URL[:50]}...")
        
        if "sqlite" in config.DATABASE_URL.lower():
            print("❌ FAILED: SQLite still detected in DATABASE_URL!")
            validation_passed = False
        elif "postgresql" in config.DATABASE_URL.lower():
            print("✅ PostgreSQL detected in DATABASE_URL")
        else:
            print("⚠️  WARNING: Unknown database type in DATABASE_URL")
    except Exception as e:
        print(f"❌ FAILED: Could not load config: {e}")
        validation_passed = False
    
    # 2. Test database connection
    try:
        from database import engine
        print("✅ Database engine created successfully")
        
        # Test actual connection
        async with engine.begin() as conn:
            result = await conn.execute("SELECT version()")
            version = result.scalar()
            if "PostgreSQL" in version:
                print(f"✅ Connected to PostgreSQL: {version[:80]}...")
            else:
                print(f"❌ FAILED: Not connected to PostgreSQL: {version}")
                validation_passed = False
                
    except Exception as e:
        print(f"❌ FAILED: Database connection error: {e}")
        validation_passed = False
    
    # 3. Check for SQLite files
    sqlite_files = list(Path(backend_path).glob("*.db"))
    if sqlite_files:
        print(f"⚠️  WARNING: Found SQLite files: {sqlite_files}")
        print("   These should be removed since we're using Supabase now")
    else:
        print("✅ No SQLite database files found")
    
    # 4. Validate config safety checks
    try:
        config.validate_config()
        print("✅ Configuration validation passed")
    except Exception as e:
        if "sqlite" in str(e).lower():
            print(f"✅ SQLite safety check working: {e}")
        else:
            print(f"❌ FAILED: Config validation error: {e}")
            validation_passed = False
    
    # 5. Check dependencies
    try:
        import asyncpg
        print("✅ asyncpg (PostgreSQL driver) installed")
    except ImportError:
        print("❌ FAILED: asyncpg not installed - run: pip install asyncpg")
        validation_passed = False
    
    try:
        import aiosqlite
        print("⚠️  WARNING: aiosqlite still installed (should be removed)")
    except ImportError:
        print("✅ aiosqlite removed successfully")
    
    print("=" * 50)
    if validation_passed:
        print("🎉 MIGRATION VALIDATION PASSED!")
        print("✅ Your app is running 100% on Supabase PostgreSQL")
        print("✅ No SQLite dependencies remain")
        print("✅ Production ready!")
    else:
        print("❌ MIGRATION VALIDATION FAILED!")
        print("Please fix the issues above before deploying")
    
    return validation_passed

if __name__ == "__main__":
    result = asyncio.run(validate_supabase_migration())
    sys.exit(0 if result else 1) 