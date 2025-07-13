#!/usr/bin/env python3
"""
Supabase Database Connection Validator
This script validates the connection to Supabase PostgreSQL database.
"""

import os
import sys
import asyncio
import asyncpg
from dotenv import load_dotenv

def load_environment():
    """Load environment variables from .env file"""
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if not os.path.exists(env_path):
        print("❌ .env file not found in backend directory")
        return False
    
    load_dotenv(env_path)
    return True

async def validate_database_connection():
    """Test connection to Supabase PostgreSQL database"""
    try:
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            print("❌ DATABASE_URL not found in environment variables")
            return False
        
        # Parse the connection URL - handle both formats
        if not (database_url.startswith('postgresql://') or database_url.startswith('postgresql+asyncpg://')):
            print("❌ DATABASE_URL must be a PostgreSQL connection string")
            return False
        
        # Convert SQLAlchemy format to standard PostgreSQL format for asyncpg
        connection_url = database_url.replace('postgresql+asyncpg://', 'postgresql://')
        
        print("🔌 Testing database connection...")
        
        # Test connection
        conn = await asyncpg.connect(connection_url)
        
        # Test a simple query
        result = await conn.fetchval('SELECT 1')
        if result == 1:
            print("✅ Database connection successful")
            
            # Test if we can access basic tables (optional)
            try:
                await conn.fetchval('SELECT COUNT(*) FROM auth.users')
                print("✅ Supabase auth schema accessible")
            except Exception as e:
                print("⚠️  Auth schema check failed (this might be normal):", str(e))
        
        await conn.close()
        return True
        
    except asyncpg.exceptions.InvalidCatalogNameError:
        print("❌ Database does not exist or is not accessible")
        return False
    except asyncpg.exceptions.InvalidPasswordError:
        print("❌ Invalid database credentials")
        return False
    except asyncpg.exceptions.ConnectionFailureError as e:
        print(f"❌ Failed to connect to database: {e}")
        return False
    except Exception as e:
        print(f"❌ Database validation error: {e}")
        return False

def validate_api_keys():
    """Validate required API keys"""
    required_keys = ['SUPABASE_URL', 'SUPABASE_ANON_KEY']
    optional_keys = ['GEMINI_API_KEY']
    missing_keys = []
    
    # Check required keys
    for key in required_keys:
        if not os.getenv(key):
            missing_keys.append(key)
    
    # Check optional keys and warn if missing
    missing_optional = []
    for key in optional_keys:
        if not os.getenv(key):
            missing_optional.append(key)
    
    if missing_keys:
        print(f"❌ Missing required environment variables: {', '.join(missing_keys)}")
        return False
    
    if missing_optional:
        print(f"⚠️  Missing optional environment variables: {', '.join(missing_optional)}")
        print("   (These are not required for basic functionality)")
    
    print("✅ All required API keys present")
    return True

async def main():
    """Main validation function"""
    print("🔍 Starting Supabase validation...")
    
    # Load environment
    if not load_environment():
        sys.exit(1)
    
    # Validate API keys
    api_keys_valid = validate_api_keys()
    
    # Validate database connection
    db_valid = await validate_database_connection()
    
    if db_valid and api_keys_valid:
        print("✅ All validations passed!")
        sys.exit(0)
    else:
        print("❌ Validation failed!")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main()) 