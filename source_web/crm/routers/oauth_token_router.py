"""
OAuth Token Router
Endpoints for managing OAuth tokens (Google and Microsoft)
Stores tokens in database for auto-refresh functionality
"""

import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from services.oauth_token_manager import OAuthTokenManager
from routers.crm_data_router import get_db_connection
from auth.providers import verify_auth_token, auth_provider

logger = logging.getLogger(__name__)

router = APIRouter()


class SaveTokenRequest(BaseModel):
    """Request to save OAuth tokens"""
    provider: str  # 'google' or 'microsoft'
    access_token: str
    refresh_token: str
    expires_in: int  # Token expiry in seconds (usually 3600)
    scope: Optional[str] = None
    employee_id: Optional[int] = None


class TokenStatusResponse(BaseModel):
    """Response with token status"""
    has_token: bool
    provider: str
    user_email: str
    expires_at: Optional[str] = None
    scope: Optional[str] = None


@router.post("/api/crm/oauth/save-tokens")
async def save_oauth_tokens(
    request: SaveTokenRequest,
    user_claims: dict = Depends(verify_auth_token)
):
    """
    Save OAuth tokens to database for auto-refresh.
    Called by frontend after user authenticates with Google/Microsoft.

    Args:
        request: Token data including access_token, refresh_token, etc.
        user_claims: Current user from JWT token

    Returns:
        Success message
    """
    try:
        user_email = user_claims.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in token")

        # Validate provider
        if request.provider not in ['google', 'microsoft']:
            raise HTTPException(status_code=400, detail="Provider must be 'google' or 'microsoft'")

        # Get database connection
        conn = get_db_connection(user_email)

        # Create token manager
        token_manager = OAuthTokenManager(conn, auth_provider)

        # Store tokens
        success = await token_manager.store_tokens(
            user_email=user_email,
            provider=request.provider,
            access_token=request.access_token,
            refresh_token=request.refresh_token,
            expires_in=request.expires_in,
            scope=request.scope,
            employee_id=request.employee_id
        )

        if not success:
            raise HTTPException(status_code=500, detail="Failed to save tokens")

        logger.info(f"✅ Saved {request.provider} tokens for {user_email}")

        return {
            "success": True,
            "message": f"Successfully saved {request.provider} tokens",
            "user_email": user_email,
            "provider": request.provider
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error saving OAuth tokens: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/api/crm/oauth/token-status/{provider}")
async def get_token_status(
    provider: str,
    user_claims: dict = Depends(verify_auth_token)
) -> TokenStatusResponse:
    """
    Check if user has stored OAuth tokens for a provider.

    Args:
        provider: 'google' or 'microsoft'
        user_claims: Current user from JWT token

    Returns:
        Token status information
    """
    try:
        user_email = user_claims.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in token")

        # Validate provider
        if provider not in ['google', 'microsoft']:
            raise HTTPException(status_code=400, detail="Provider must be 'google' or 'microsoft'")

        # Get database connection
        conn = get_db_connection(user_email)

        # Create token manager
        token_manager = OAuthTokenManager(conn, auth_provider)

        # Get token info
        token_info = await token_manager.get_token_info(user_email, provider)

        if token_info:
            return TokenStatusResponse(
                has_token=True,
                provider=provider,
                user_email=user_email,
                expires_at=token_info['token_expiry'].isoformat(),
                scope=token_info.get('scope')
            )
        else:
            return TokenStatusResponse(
                has_token=False,
                provider=provider,
                user_email=user_email
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error checking token status: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/api/crm/oauth/delete-tokens/{provider}")
async def delete_oauth_tokens(
    provider: str,
    user_claims: dict = Depends(verify_auth_token)
):
    """
    Delete stored OAuth tokens for a provider.

    Args:
        provider: 'google' or 'microsoft'
        user_claims: Current user from JWT token

    Returns:
        Success message
    """
    try:
        user_email = user_claims.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in token")

        # Validate provider
        if provider not in ['google', 'microsoft']:
            raise HTTPException(status_code=400, detail="Provider must be 'google' or 'microsoft'")

        # Get database connection
        conn = get_db_connection(user_email)

        # Create token manager
        token_manager = OAuthTokenManager(conn, auth_provider)

        # Delete tokens
        success = await token_manager.delete_tokens(user_email, provider)

        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete tokens")

        logger.info(f"✅ Deleted {provider} tokens for {user_email}")

        return {
            "success": True,
            "message": f"Successfully deleted {provider} tokens",
            "user_email": user_email,
            "provider": provider
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting OAuth tokens: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
