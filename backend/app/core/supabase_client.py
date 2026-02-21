"""
Vault Sentry - Supabase Client Configuration
Provides Supabase client for backend operations
"""

from typing import Optional
from supabase import create_client, Client
from loguru import logger

from app.core.config import settings

_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """
    Get or create Supabase client singleton.
    Uses service role key to bypass RLS for backend operations.
    """
    global _supabase_client
    
    if _supabase_client is None:
        if not settings.SUPABASE_URL:
            raise ValueError("SUPABASE_URL is not configured")
        
        # Prefer service key for backend operations (bypasses RLS)
        key = settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY
        
        if not key:
            raise ValueError("SUPABASE_SERVICE_KEY or SUPABASE_KEY is required")
        
        _supabase_client = create_client(settings.SUPABASE_URL, key)
        logger.info("Supabase client initialized")
    
    return _supabase_client


def is_supabase_configured() -> bool:
    """Check if Supabase is properly configured"""
    return bool(
        settings.SUPABASE_URL and 
        (settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY)
    )
